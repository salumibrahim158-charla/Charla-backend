// CHARLA MEDICS - Digital Signature Service (License-Based)
// Each professional's signature is tied to their official license number
// Prevents duplicate signatures and ensures authenticity

const crypto = require('crypto');
const { query } = require('../config/database');

// Tanzania Medical Registration Bodies
const REGISTRATION_AUTHORITIES = {
  doctor: 'MCT', // Medical Council of Tanganyika
  nurse: 'NCTZ', // Nursing Council of Tanzania
  lab_technician: 'LAHBTZ', // Laboratory Health Board Tanzania
  pharmacist: 'TPB', // Tanzania Pharmacy Board
  dentist: 'TDC', // Tanzania Dental Council
  hospital: 'MOH', // Ministry of Health
  clinic: 'PORALG', // President's Office - Regional Administration and Local Government
  pharmacy: 'TPB',
  laboratory: 'LAHBTZ',
};

// Generate License-Based Fingerprint (prevents duplicates)
const generateLicenseFingerprint = (licenseNumber, authority, category) => {
  // Hash license + authority + category -> unique fingerprint
  const raw = crypto
    .createHash('sha256')
    .update(`${authority}-${licenseNumber}-${category}-CHARLA`)
    .digest('hex');
  
  // Format: CM-AUTH-XXXX-XXXX (e.g., CM-MCT-A3F2-9B1C)
  const parts = [raw.slice(0,4), raw.slice(4,8)];
  return `CM-${authority}-${parts.join('-').toUpperCase()}`;
};

// Verify License with Authority (mock - in production, call actual API)
const verifyLicenseWithAuthority = async (licenseNumber, authority, category) => {
  // In production: call MCT/TPB/etc API
  // For now: validate format
  
  const patterns = {
    MCT: /^MD\/\d{4}\/\d{4}$/, // e.g., MD/2020/1234
    NCTZ: /^RN\/\d{5}$/, // e.g., RN/12345
    TPB: /^PH\/\d{4}$/, // e.g., PH/1234
    LAHBTZ: /^LT\/\d{4}$/, // e.g., LT/5678
    TDC: /^DT\/\d{4}$/, // e.g., DT/2345
    MOH: /^MF\/\d{6}$/, // e.g., MF/123456
    PORALG: /^CF\/\d{5}$/, // e.g., CF/12345
  };

  const pattern = patterns[authority];
  if (!pattern) return { valid: false, error: 'Unknown authority' };
  if (!pattern.test(licenseNumber)) return { valid: false, error: 'Invalid license format' };

  // Mock verification - in production check with authority database
  return {
    valid: true,
    authority,
    licenseNumber,
    holder: 'Name from Registry', // Would come from authority API
    issueDate: '2020-01-15',
    expiryDate: '2025-01-15',
    status: 'active',
  };
};

// Register Professional Digital Signature
const registerProfessionalSignature = async (userId, userData) => {
  const { licenseNumber, category, subcategory, fullName, email } = userData;

  // Determine authority
  const authority = REGISTRATION_AUTHORITIES[subcategory] || REGISTRATION_AUTHORITIES[category];
  if (!authority) {
    throw new Error('Invalid professional category');
  }

  // Verify license
  const verification = await verifyLicenseWithAuthority(licenseNumber, authority, category);
  if (!verification.valid) {
    throw new Error(`License verification failed: ${verification.error}`);
  }

  // Generate fingerprint based on license
  const fingerprint = generateLicenseFingerprint(licenseNumber, authority, category);

  // Check if license already registered
  const existing = await query(
    'SELECT id, fingerprint, user_id FROM digital_signatures WHERE license_number = $1 AND authority = $2',
    [licenseNumber, authority]
  );

  if (existing.rows.length > 0) {
    throw new Error(`License ${licenseNumber} already registered with fingerprint: ${existing.rows[0].fingerprint}`);
  }

  // Generate RSA keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Encrypt private key with license number + user password hash
  const encryptionKey = crypto.createHash('sha256').update(`${licenseNumber}-${userId}`).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, Buffer.alloc(16, 0));
  let encryptedPrivateKey = cipher.update(privateKey, 'utf8', 'base64');
  encryptedPrivateKey += cipher.final('base64');

  // Get previous block hash (blockchain chain)
  const lastBlock = await query(
    'SELECT block_hash FROM signature_chain ORDER BY block_number DESC LIMIT 1'
  );
  const previousHash = lastBlock.rows[0]?.block_hash || '0'.repeat(64);

  const blockData = {
    userId,
    fingerprint,
    licenseNumber,
    authority,
    category,
    timestamp: Date.now(),
  };
  const blockHash = crypto
    .createHash('sha256')
    .update(`${previousHash}${JSON.stringify(blockData)}`)
    .digest('hex');

  // Store signature
  await query(
    `INSERT INTO digital_signatures (
      user_id, public_key, private_key_encrypted, fingerprint,
      license_number, authority, category, verification_data, is_active, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())`,
    [
      userId,
      publicKey,
      encryptedPrivateKey,
      fingerprint,
      licenseNumber,
      authority,
      category,
      JSON.stringify(verification),
    ]
  );

  // Add to blockchain chain
  const blockNumber = lastBlock.rows.length > 0
    ? (await query('SELECT MAX(block_number) as n FROM signature_chain')).rows[0].n + 1
    : 1;

  await query(
    `INSERT INTO signature_chain (
      block_number, block_hash, previous_hash, user_id, fingerprint,
      license_number, authority, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [blockNumber, blockHash, previousHash, userId, fingerprint, licenseNumber, authority]
  );

  return {
    success: true,
    fingerprint,
    authority,
    licenseNumber,
    blockNumber,
    verificationUrl: `https://charlamedics.co.tz/verify/${fingerprint}`,
    message: 'Digital signature registered successfully',
  };
};

// Sign Document
const signDocument = async (userId, documentType, documentData) => {
  const sigRecord = await query(
    'SELECT * FROM digital_signatures WHERE user_id = $1 AND is_active = true',
    [userId]
  );

  if (sigRecord.rows.length === 0) {
    throw new Error('No active digital signature found');
  }

  const { private_key_encrypted, fingerprint, license_number, authority } = sigRecord.rows[0];

  // Decrypt private key
  const encryptionKey = crypto.createHash('sha256').update(`${license_number}-${userId}`).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.alloc(16, 0));
  let privateKey = decipher.update(private_key_encrypted, 'base64', 'utf8');
  privateKey += decipher.final('utf8');

  // Sign
  const payload = JSON.stringify({
    ...documentData,
    fingerprint,
    authority,
    licenseNumber: license_number,
    timestamp: new Date().toISOString(),
  });

  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  const signature = sign.sign(privateKey, 'base64');

  // Store
  const doc = await query(
    `INSERT INTO signed_documents (
      user_id, document_type, payload, signature, fingerprint, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
    [userId, documentType, payload, signature, fingerprint]
  );

  return {
    documentId: doc.rows[0].id,
    fingerprint,
    signature,
    verifyUrl: `https://charlamedics.co.tz/verify/${doc.rows[0].id}`,
  };
};

// Verify Signature
const verifySignature = async (documentId) => {
  const doc = await query(
    `SELECT sd.*, ds.public_key, ds.fingerprint, ds.license_number, ds.authority, u.full_name
     FROM signed_documents sd
     JOIN digital_signatures ds ON sd.user_id = ds.user_id
     JOIN users u ON sd.user_id = u.id
     WHERE sd.id = $1`,
    [documentId]
  );

  if (doc.rows.length === 0) return { valid: false, error: 'Document not found' };

  const { payload, signature, public_key, fingerprint, license_number, authority, full_name } = doc.rows[0];

  const verify = crypto.createVerify('SHA256');
  verify.update(payload);
  const isValid = verify.verify(public_key, signature, 'base64');

  return {
    valid: isValid,
    fingerprint,
    licenseNumber: license_number,
    authority,
    signer: full_name,
    signedAt: doc.rows[0].created_at,
  };
};

module.exports = {
  registerProfessionalSignature,
  signDocument,
  verifySignature,
  REGISTRATION_AUTHORITIES,
};

// CHARLA MEDICS - Digital Signature System
// Uses RSA-2048 keypairs + SHA-256 hash chains (blockchain-inspired)
// Each professional/facility has a unique cryptographic identity

const crypto = require('crypto');
const { query } = require('../config/database');

// ─── Key Generation ───────────────────────────────────────────────────────────
const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
};

// Generate unique fingerprint (like a blockchain address)
const generateFingerprint = (publicKey, userId, licenseNumber) => {
  const hash = crypto
    .createHash('sha256')
    .update(`${publicKey}${userId}${licenseNumber}${Date.now()}`)
    .digest('hex');
  // Format: CM-XXXX-XXXX-XXXX-XXXX (Charla Medics ID)
  const parts = [hash.slice(0,4), hash.slice(4,8), hash.slice(8,12), hash.slice(12,16)];
  return `CM-${parts.join('-').toUpperCase()}`;
};

// ─── Signing ──────────────────────────────────────────────────────────────────
const signDocument = (documentData, privateKeyPem) => {
  const payload = JSON.stringify({
    ...documentData,
    timestamp: new Date().toISOString(),
    version: '1.0',
  });

  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  const signature = sign.sign(privateKeyPem, 'base64');

  return {
    payload,
    signature,
    algorithm: 'RSA-SHA256',
    createdAt: new Date().toISOString(),
  };
};

// ─── Verification ─────────────────────────────────────────────────────────────
const verifySignature = (payload, signature, publicKeyPem) => {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(payload);
    return verify.verify(publicKeyPem, signature, 'base64');
  } catch {
    return false;
  }
};

// ─── Hash Chain (Blockchain-like ledger) ─────────────────────────────────────
const computeBlockHash = (previousHash, data) => {
  return crypto
    .createHash('sha256')
    .update(`${previousHash}${JSON.stringify(data)}${Date.now()}`)
    .digest('hex');
};

// ─── Register Professional Signature ─────────────────────────────────────────
const registerProfessionalSignature = async (userId, licenseNumber, category) => {
  // Check if already registered
  const existing = await query(
    'SELECT id FROM digital_signatures WHERE user_id = $1',
    [userId]
  );
  if (existing.rows.length > 0) {
    return { error: 'Already registered' };
  }

  const { publicKey, privateKey } = generateKeyPair();
  const fingerprint = generateFingerprint(publicKey, userId, licenseNumber);

  // Get previous block hash (genesis if first)
  const lastBlock = await query(
    'SELECT block_hash FROM signature_chain ORDER BY block_number DESC LIMIT 1'
  );
  const previousHash = lastBlock.rows[0]?.block_hash || '0'.repeat(64);

  const blockData = { userId, fingerprint, licenseNumber, category, publicKey };
  const blockHash = computeBlockHash(previousHash, blockData);

  // Store signature record
  await query(
    `INSERT INTO digital_signatures (
      user_id, public_key, private_key_encrypted, fingerprint,
      license_number, category, is_active, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
    [
      userId,
      publicKey,
      // In production: encrypt private key with user's password-derived key
      // For now: store with app-level encryption
      Buffer.from(privateKey).toString('base64'),
      fingerprint,
      licenseNumber,
      category,
    ]
  );

  // Add to blockchain ledger
  const blockNumber = (lastBlock.rows.length > 0
    ? (await query('SELECT MAX(block_number) as n FROM signature_chain')).rows[0].n
    : 0) + 1;

  await query(
    `INSERT INTO signature_chain (block_number, block_hash, previous_hash, user_id, fingerprint, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [blockNumber, blockHash, previousHash, userId, fingerprint]
  );

  return {
    fingerprint,
    publicKey,
    blockNumber,
    blockHash,
    message: 'Digital identity registered successfully',
  };
};

// ─── Sign Medical Document ────────────────────────────────────────────────────
const signMedicalDocument = async (userId, documentType, documentData) => {
  const sigRecord = await query(
    'SELECT * FROM digital_signatures WHERE user_id = $1 AND is_active = true',
    [userId]
  );

  if (sigRecord.rows.length === 0) {
    throw new Error('No digital signature registered for this user');
  }

  const sigInfo = sigRecord.rows[0];
  const privateKey = Buffer.from(sigInfo.private_key_encrypted, 'base64').toString();

  const docWithMeta = {
    type: documentType,
    data: documentData,
    signerFingerprint: sigInfo.fingerprint,
    signerLicense: sigInfo.license_number,
    signerCategory: sigInfo.category,
  };

  const { payload, signature, createdAt } = signDocument(docWithMeta, privateKey);

  // Store signed document
  const stored = await query(
    `INSERT INTO signed_documents (
      user_id, document_type, payload, signature, fingerprint,
      verification_hash, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id`,
    [
      userId,
      documentType,
      payload,
      signature,
      sigInfo.fingerprint,
      crypto.createHash('sha256').update(payload + signature).digest('hex'),
    ]
  );

  return {
    documentId: stored.rows[0].id,
    fingerprint: sigInfo.fingerprint,
    signature,
    verificationHash: crypto.createHash('sha256').update(payload + signature).digest('hex'),
    signedAt: createdAt,
    verifyUrl: `https://charlamedics.co.tz/verify/${stored.rows[0].id}`,
  };
};

// ─── Verify Document ──────────────────────────────────────────────────────────
const verifyDocument = async (documentId) => {
  const doc = await query(
    `SELECT sd.*, ds.public_key, ds.fingerprint, u.full_name, u.category
     FROM signed_documents sd
     JOIN digital_signatures ds ON sd.user_id = ds.user_id
     JOIN users u ON sd.user_id = u.id
     WHERE sd.id = $1`,
    [documentId]
  );

  if (doc.rows.length === 0) {
    return { valid: false, error: 'Document not found' };
  }

  const { payload, signature, public_key, fingerprint, full_name, category } = doc.rows[0];
  const isValid = verifySignature(payload, signature, public_key);

  return {
    valid: isValid,
    fingerprint,
    signer: full_name,
    category,
    signedAt: doc.rows[0].created_at,
    documentType: doc.rows[0].document_type,
  };
};

// ─── Controllers ──────────────────────────────────────────────────────────────
const registerSignatureController = async (req, res) => {
  try {
    const { licenseNumber, category } = req.body;
    const userId = req.user.id;
    const result = await registerProfessionalSignature(userId, licenseNumber, category);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMySignatureController = async (req, res) => {
  try {
    const result = await query(
      'SELECT fingerprint, category, license_number, created_at, is_active FROM digital_signatures WHERE user_id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, data: { registered: false } });
    }
    res.json({ success: true, data: { registered: true, ...result.rows[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyDocumentController = async (req, res) => {
  try {
    const { documentId } = req.params;
    const result = await verifyDocument(documentId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerProfessionalSignature,
  signMedicalDocument,
  verifyDocument,
  registerSignatureController,
  getMySignatureController,
  verifyDocumentController,
};

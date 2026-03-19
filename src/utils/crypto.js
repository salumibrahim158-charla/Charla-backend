const crypto = require('crypto');

/**
 * Crypto Utility - V1.2
 * Encryption and decryption for sensitive data
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'charla2026secret!xyz'; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

// Ensure encryption key is 32 bytes
const getKey = () => {
  const key = ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32);
  return Buffer.from(key);
};

/**
 * Encrypt text
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text (format: iv:encryptedData)
 */
exports.encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt text
 * @param {string} text - Encrypted text (format: iv:encryptedData)
 * @returns {string} - Decrypted plain text
 */
exports.decrypt = (text) => {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash password
 * @param {string} password - Plain password
 * @returns {string} - Hashed password
 */
exports.hashPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(password + ENCRYPTION_KEY)
    .digest('hex');
};

/**
 * Verify password
 * @param {string} password - Plain password
 * @param {string} hashedPassword - Hashed password
 * @returns {boolean} - Match result
 */
exports.verifyPassword = (password, hashedPassword) => {
  const hash = exports.hashPassword(password);
  return hash === hashedPassword;
};

/**
 * Generate random token
 * @param {number} length - Token length (default: 32)
 * @returns {string} - Random token
 */
exports.generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate OTP
 * @param {number} length - OTP length (default: 6)
 * @returns {string} - OTP code
 */
exports.generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

/**
 * Hash data (one-way)
 * @param {string} data - Data to hash
 * @returns {string} - Hashed data
 */
exports.hash = (data) => {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
};

/**
 * Generate HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} - HMAC signature
 */
exports.generateHMAC = (data, secret) => {
  return crypto
    .createHmac('sha256', secret || ENCRYPTION_KEY)
    .update(data)
    .digest('hex');
};

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} - Verification result
 */
exports.verifyHMAC = (data, signature, secret) => {
  const calculatedSignature = exports.generateHMAC(data, secret);
  return calculatedSignature === signature;
};

/**
 * Mask sensitive data (for logging)
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of visible characters at start/end
 * @returns {string} - Masked data
 */
exports.mask = (data, visibleChars = 4) => {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(data?.length || 0);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const masked = '*'.repeat(data.length - (visibleChars * 2));
  
  return start + masked + end;
};

/**
 * Encrypt object
 * @param {Object} obj - Object to encrypt
 * @returns {string} - Encrypted JSON string
 */
exports.encryptObject = (obj) => {
  const jsonString = JSON.stringify(obj);
  return exports.encrypt(jsonString);
};

/**
 * Decrypt object
 * @param {string} encryptedData - Encrypted JSON string
 * @returns {Object} - Decrypted object
 */
exports.decryptObject = (encryptedData) => {
  const jsonString = exports.decrypt(encryptedData);
  return JSON.parse(jsonString);
};

module.exports = exports;

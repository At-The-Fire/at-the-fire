require('dotenv').config();
const crypto = require('crypto');

// Derive a 32-byte key from the string ENCRYPTION_KEY using scrypt
// Salt is fixed so the same key is derived consistently across restarts
let cachedKeyBuffer;
let cachedKeySource;
function getKeyBuffer() {
  const keySource = process.env.ENCRYPTION_KEY;
  if (!keySource) {
    throw new Error('ENCRYPTION_KEY is not set');
  }

  if (cachedKeyBuffer && cachedKeySource === keySource) {
    return cachedKeyBuffer;
  }

  cachedKeySource = keySource;
  cachedKeyBuffer = crypto.scryptSync(keySource, 'atf-salt-v1', 32);
  return cachedKeyBuffer;
}

function encrypt(text) {
  if (text === null || text === '') {
    return null;
  }
  const keyBuffer = getKeyBuffer();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) {
    return null;
  }

  try {
    // Legacy CryptoJS format (base64, starts with "U2FsdGVk" = "Salted__")
    if (ciphertext.startsWith('U2FsdGVk')) {
      const CryptoJS = require('crypto-js/core');
      require('crypto-js/aes');
      const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted === '') {
        throw new Error('Decryption resulted in an empty string');
      }
      return decrypted;
    }

    // New format: iv:authTag:ciphertext (all hex, colon-separated)
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const keyBuffer = getKeyBuffer();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    console.error('Error during decryption:', e.message);
    return null;
  }
}

function isEncrypted(data) {
  if (!data) return false;
  // New format: three colon-separated hex segments
  if (data.split(':').length === 3) return true;
  // Legacy CryptoJS format
  if (data.startsWith('U2FsdGVk')) return true;
  return false;
}

module.exports = { encrypt, decrypt, isEncrypted };

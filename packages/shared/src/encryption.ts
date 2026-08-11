import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const DEFAULT_SECRET = 'sentinel-default-encryption-secret-32-chars-long';
const SECRET_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET || DEFAULT_SECRET).digest();

export async function encryptText(text: string): Promise<string> {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export async function decryptText(encryptedData: string): Promise<string> {
  if (!encryptedData || !encryptedData.includes(':')) return encryptedData;
  try {
    const [ivHex, encryptedText] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt text:', error);
    return encryptedData;
  }
}

export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '********';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

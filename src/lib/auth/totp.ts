import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const ENCRYPTION_KEY =
  process.env.TOTP_ENCRYPTION_KEY ||
  "default-encryption-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypt a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt a string using AES-256-CBC
 */
export function decrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  return OTPAuth.Secret.fromBase32(
    OTPAuth.Secret.fromHex(crypto.randomBytes(20).toString("hex")).base32,
  ).base32;
}

/**
 * Generate QR code data URL for TOTP setup
 */
export async function generateQRCode(params: {
  email: string;
  secret: string;
  appName?: string;
}): Promise<string> {
  const { email, secret, appName = "DevHub" } = params;

  const totp = new OTPAuth.TOTP({
    issuer: appName,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const otpauth = totp.toString();

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Verify a TOTP token
 */
export function verifyTOTP(params: {
  token: string;
  secret: string;
  window?: number;
}): boolean {
  const { token, secret, window = 1 } = params;

  try {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Validate the token with a time window (allows for time drift)
    const delta = totp.validate({ token, window });

    return delta !== null;
  } catch (error) {
    console.error("Error verifying TOTP:", error);
    return false;
  }
}

/**
 * Generate backup codes for TOTP
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Hash backup codes for storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashedCodes = await Promise.all(
    codes.map((code) => bcrypt.hash(code, 10)),
  );
  return hashedCodes;
}

/**
 * Verify a backup code against hashed codes
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<{ isValid: boolean; usedIndex: number }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await bcrypt.compare(code, hashedCodes[i]);
    if (isValid) {
      return { isValid: true, usedIndex: i };
    }
  }

  return { isValid: false, usedIndex: -1 };
}

/**
 * Generate the current TOTP token for a secret (useful for testing)
 */
export function generateCurrentToken(secret: string): string {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  return totp.generate();
}

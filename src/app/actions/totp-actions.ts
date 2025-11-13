"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  encrypt,
  decrypt,
} from "@/lib/auth/totp";

export type TotpActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * Setup TOTP for a user - generates secret and QR code
 */
export async function setupTOTP(userId?: string): Promise<
  TotpActionResponse<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }>
> {
  try {
    const session = await auth();
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return { status: "error", error: "Unauthorized" };
    }

    if (userId && session && userId !== session?.user?.id) {
      if (session?.user?.role !== "ADMIN") {
        return { status: "error", error: "Unauthorized" };
      }
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, totpEnabled: true },
    });

    if (!user || !user.email) {
      return { status: "error", error: "User not found" };
    }

    const secret = generateTOTPSecret();
    const qrCode = await generateQRCode({
      email: user.email,
      secret,
    });

    const backupCodes = generateBackupCodes(10);

    return {
      status: "success",
      data: {
        secret,
        qrCode,
        backupCodes,
      },
    };
  } catch (error) {
    console.error("Setup TOTP error:", error);
    return { status: "error", error: "Failed to setup TOTP" };
  }
}

/**
 * Enable TOTP for a user after verifying the token
 */
const EnableTOTPSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  token: z.string().length(6, "Token must be 6 digits"),
  backupCodes: z.array(z.string()),
  userId: z.string().optional(),
});

export async function enableTOTP(
  data: z.infer<typeof EnableTOTPSchema>,
): Promise<TotpActionResponse<{ backupCodes: string[] }>> {
  try {
    const validated = EnableTOTPSchema.parse(data);
    const session = await auth();
    const targetUserId = validated.userId || session?.user?.id;

    if (!targetUserId) {
      return { status: "error", error: "Unauthorized" };
    }

    if (validated.userId && session && validated.userId !== session?.user?.id) {
      if (session?.user?.role !== "ADMIN") {
        return { status: "error", error: "Unauthorized" };
      }
    }

    const isValid = verifyTOTP({
      token: validated.token,
      secret: validated.secret,
    });

    if (!isValid) {
      return { status: "error", error: "Invalid verification code" };
    }

    const hashedBackupCodes = await hashBackupCodes(validated.backupCodes);
    const encryptedSecret = encrypt(validated.secret);

    await db.user.update({
      where: { id: targetUserId },
      data: {
        totpSecret: encryptedSecret,
        totpEnabled: true,
        totpBackupCodes: hashedBackupCodes,
      },
    });

    return {
      status: "success",
      data: {
        backupCodes: validated.backupCodes,
      },
    };
  } catch (error) {
    console.error("Enable TOTP error:", error);
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return { status: "error", error: "Failed to enable TOTP" };
  }
}

/**
 * Verify TOTP token for a user
 */
const VerifyTOTPSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  token: z
    .string()
    .min(6, "Token must be at least 6 characters")
    .max(8, "Token must be at most 8 characters"),
});

export async function verifyUserTOTP(
  data: z.infer<typeof VerifyTOTPSchema>,
): Promise<TotpActionResponse<{ verified: true }>> {
  try {
    const validated = VerifyTOTPSchema.parse(data);

    const user = await db.user.findUnique({
      where: { id: validated.userId },
      select: { totpSecret: true, totpEnabled: true, totpBackupCodes: true },
    });

    if (!user) {
      console.error("verifyUserTOTP: User not found", validated.userId);
      return { status: "error", error: "User not found" };
    }

    if (!user.totpEnabled) {
      console.error(
        "verifyUserTOTP: TOTP not enabled for user",
        validated.userId,
      );
      return { status: "error", error: "TOTP not enabled" };
    }

    if (!user.totpSecret) {
      console.error(
        "verifyUserTOTP: No TOTP secret for user",
        validated.userId,
      );
      return { status: "error", error: "TOTP not configured" };
    }

    let secret: string;
    try {
      secret = decrypt(user.totpSecret);
    } catch (decryptError) {
      console.error(
        "verifyUserTOTP: Failed to decrypt TOTP secret",
        decryptError,
      );
      return { status: "error", error: "Failed to decrypt TOTP secret" };
    }

    // First, try to verify as TOTP token
    const isValidTOTP = verifyTOTP({
      token: validated.token,
      secret,
    });

    if (isValidTOTP) {
      return { status: "success", data: { verified: true } };
    }

    // If TOTP fails, try backup code
    const backupCodeResult = await verifyBackupCode(
      validated.token,
      user.totpBackupCodes,
    );

    if (backupCodeResult.isValid) {
      // Remove used backup code
      const updatedBackupCodes = user.totpBackupCodes.filter(
        (_, index) => index !== backupCodeResult.usedIndex,
      );

      await db.user.update({
        where: { id: validated.userId },
        data: { totpBackupCodes: updatedBackupCodes },
      });

      return { status: "success", data: { verified: true } };
    }

    console.error("verifyUserTOTP: Invalid TOTP code and backup code", {
      userId: validated.userId,
      tokenLength: validated.token.length,
    });
    return { status: "error", error: "Invalid authentication code" };
  } catch (error) {
    console.error("Verify TOTP error:", error);
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to verify TOTP",
    };
  }
}

/**
 * Disable TOTP for a user
 */
export async function disableTOTP(
  userId?: string,
): Promise<TotpActionResponse<{ disabled: true }>> {
  try {
    const session = await auth();
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return { status: "error", error: "Unauthorized" };
    }

    if (userId && session && userId !== session?.user?.id) {
      if (session?.user?.role !== "ADMIN") {
        return { status: "error", error: "Unauthorized" };
      }
    }

    await db.user.update({
      where: { id: targetUserId },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpBackupCodes: [],
      },
    });

    return { status: "success", data: { disabled: true } };
  } catch (error) {
    console.error("Disable TOTP error:", error);
    return { status: "error", error: "Failed to disable TOTP" };
  }
}

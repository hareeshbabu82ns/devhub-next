"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { disableTOTP } from "./totp-actions";

export type UserActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * Get current user
 */
async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

/**
 * Get user profile information
 */
export async function getUserProfile(): Promise<
  UserActionResponse<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    hasPassword: boolean;
    totpEnabled: boolean;
    emailVerified: Date | null;
    createdAt: Date | null;
  }>
> {
  try {
    const currentUser = await getCurrentUser();

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
        totpEnabled: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    return {
      status: "success",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        hasPassword: !!user.password,
        totpEnabled: user.totpEnabled,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    console.error("Get user profile error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to get profile",
    };
  }
}

/**
 * Update user profile (name, email)
 */
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").optional(),
});

export async function updateUserProfile(
  data: z.infer<typeof updateProfileSchema>,
): Promise<UserActionResponse<{}>> {
  try {
    const currentUser = await getCurrentUser();

    const validated = updateProfileSchema.parse(data);

    // Check if email is already taken by another user
    if (validated.email) {
      const existingUser = await db.user.findFirst({
        where: {
          email: validated.email,
          NOT: { id: currentUser.id },
        },
      });

      if (existingUser) {
        return {
          status: "error",
          error: "Email is already in use",
        };
      }
    }

    await db.user.update({
      where: { id: currentUser.id },
      data: {
        name: validated.name,
        ...(validated.email && { email: validated.email }),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/settings/profile");

    return {
      status: "success",
      data: {},
    };
  } catch (error) {
    console.error("Update profile error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: error.issues[0].message,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

/**
 * Create password for OAuth users
 */
const createPasswordSchema = z
  .object({
    newPassword: z.string().min(4, "Password must be at least 4 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function createPassword(
  data: z.infer<typeof createPasswordSchema>,
): Promise<UserActionResponse<{}>> {
  try {
    const currentUser = await getCurrentUser();
    const bcrypt = require("bcryptjs");

    const validated = createPasswordSchema.parse(data);

    // Get user
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    if (user.password) {
      return {
        status: "error",
        error: "Password already exists. Use change password instead.",
      };
    }

    // Hash and set new password
    const hashedPassword = await bcrypt.hash(validated.newPassword, 10);

    await db.user.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    });

    revalidatePath("/settings/profile");
    revalidatePath("/settings/security");

    return {
      status: "success",
      data: {},
    };
  } catch (error) {
    console.error("Create password error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: error.issues[0].message,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to create password",
    };
  }
}

/**
 * Change user password (requires current password)
 */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(4, "New password must be at least 4 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  data: z.infer<typeof changePasswordSchema>,
): Promise<UserActionResponse<{}>> {
  try {
    const currentUser = await getCurrentUser();
    const bcrypt = require("bcryptjs");

    const validated = changePasswordSchema.parse(data);

    // Get user with password
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return {
        status: "error",
        error: "Password not set for this account",
      };
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      validated.currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      return {
        status: "error",
        error: "Current password is incorrect",
      };
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(validated.newPassword, 10);

    await db.user.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    });

    revalidatePath("/settings/security");

    return {
      status: "success",
      data: {},
    };
  } catch (error) {
    console.error("Change password error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: error.issues[0].message,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to change password",
    };
  }
}

/**
 * Get user security settings
 */
export async function getUserSecuritySettings(): Promise<
  UserActionResponse<{
    totpEnabled: boolean;
    hasPassword: boolean;
    email: string | null;
  }>
> {
  try {
    const currentUser = await getCurrentUser();

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        totpEnabled: true,
        password: true,
        email: true,
      },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    return {
      status: "success",
      data: {
        totpEnabled: user.totpEnabled,
        hasPassword: !!user.password,
        email: user.email,
      },
    };
  } catch (error) {
    console.error("Get security settings error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to get settings",
    };
  }
}

/**
 * User: Disable TOTP (requires password confirmation)
 */
const disableTOTPSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function userDisableTOTP(
  data: z.infer<typeof disableTOTPSchema>,
): Promise<UserActionResponse<{}>> {
  try {
    const currentUser = await getCurrentUser();
    const bcrypt = require("bcryptjs");

    const validated = disableTOTPSchema.parse(data);

    // Get user with password
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, password: true, totpEnabled: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    if (!user.totpEnabled) {
      return { status: "error", error: "TOTP is not enabled" };
    }

    if (!user.password) {
      return {
        status: "error",
        error: "Password not set. Please contact admin.",
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      validated.password,
      user.password,
    );

    if (!isValidPassword) {
      return {
        status: "error",
        error: "Invalid password",
      };
    }

    // Disable TOTP
    await db.user.update({
      where: { id: currentUser.id },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpBackupCodes: [],
      },
    });

    revalidatePath("/settings/security");

    return {
      status: "success",
      data: {},
    };
  } catch (error) {
    console.error("User disable TOTP error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: error.issues[0].message,
      };
    }

    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to disable TOTP",
    };
  }
}

/**
 * Regenerate TOTP backup codes (requires password)
 */
const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function regenerateBackupCodes(
  data: z.infer<typeof regenerateBackupCodesSchema>,
): Promise<UserActionResponse<{ backupCodes: string[] }>> {
  try {
    const currentUser = await getCurrentUser();
    const bcrypt = require("bcryptjs");

    const validated = regenerateBackupCodesSchema.parse(data);

    // Get user with password
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, password: true, totpEnabled: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    if (!user.totpEnabled) {
      return { status: "error", error: "TOTP is not enabled" };
    }

    if (!user.password) {
      return {
        status: "error",
        error: "Password not set. Please contact admin.",
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      validated.password,
      user.password,
    );

    if (!isValidPassword) {
      return {
        status: "error",
        error: "Invalid password",
      };
    }

    // Generate new backup codes
    const { generateBackupCodes, hashBackupCodes } = await import(
      "@/lib/auth/totp"
    );

    const backupCodes = generateBackupCodes();
    const hashedCodes = await hashBackupCodes(backupCodes);

    // Update user with new backup codes
    await db.user.update({
      where: { id: currentUser.id },
      data: { totpBackupCodes: hashedCodes },
    });

    revalidatePath("/settings/security");

    return {
      status: "success",
      data: { backupCodes },
    };
  } catch (error) {
    console.error("Regenerate backup codes error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: error.issues[0].message,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to regenerate codes",
    };
  }
}

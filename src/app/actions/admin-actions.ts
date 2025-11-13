"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type AdminActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * Check if current user is admin
 */
async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return session.user;
}

/**
 * Get app settings
 */
export async function getAppSettings(): Promise<
  AdminActionResponse<{
    restrictSignup: boolean;
    allowedSignupEmails: string[];
    allowedSignupDomains: string[];
  }>
> {
  try {
    await requireAdmin();

    const settings = await db.appSettings.findFirst();

    if (!settings) {
      // Return default settings if none exist
      return {
        status: "success",
        data: {
          restrictSignup: false,
          allowedSignupEmails: [],
          allowedSignupDomains: [],
        },
      };
    }

    return {
      status: "success",
      data: {
        restrictSignup: settings.restrictSignup,
        allowedSignupEmails: settings.allowedSignupEmails,
        allowedSignupDomains: settings.allowedSignupDomains,
      },
    };
  } catch (error) {
    console.error("Get app settings error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to get settings",
    };
  }
}

/**
 * Update app settings
 */
const updateSettingsSchema = z.object({
  restrictSignup: z.boolean(),
  allowedSignupEmails: z.array(z.string().email()).optional(),
  allowedSignupDomains: z.array(z.string()).optional(),
});

export async function updateAppSettings(
  data: z.infer<typeof updateSettingsSchema>,
): Promise<AdminActionResponse<{}>> {
  try {
    await requireAdmin();

    const validated = updateSettingsSchema.parse(data);

    // Get existing settings or create new
    const existing = await db.appSettings.findFirst();

    if (existing) {
      await db.appSettings.update({
        where: { id: existing.id },
        data: {
          restrictSignup: validated.restrictSignup,
          allowedSignupEmails: validated.allowedSignupEmails || [],
          allowedSignupDomains: validated.allowedSignupDomains || [],
        },
      });
    } else {
      await db.appSettings.create({
        data: {
          restrictSignup: validated.restrictSignup,
          allowedSignupEmails: validated.allowedSignupEmails || [],
          allowedSignupDomains: validated.allowedSignupDomains || [],
        },
      });
    }

    revalidatePath("/admin/settings");

    return { status: "success", data: {} };
  } catch (error) {
    console.error("Update app settings error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<
  AdminActionResponse<
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      role: string;
      totpEnabled: boolean;
      createdAt: Date | null;
    }>
  >
> {
  try {
    await requireAdmin();

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        totpEnabled: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      status: "success",
      data: users,
    };
  } catch (error) {
    console.error("Get all users error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to get users",
    };
  }
}

/**
 * Admin: Reset user password
 */
const resetUserPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(4, "Password must be at least 4 characters"),
});

export async function adminResetUserPassword(
  data: z.infer<typeof resetUserPasswordSchema>,
): Promise<AdminActionResponse<{}>> {
  try {
    await requireAdmin();

    const validated = resetUserPasswordSchema.parse(data);
    const bcrypt = require("bcryptjs");

    const user = await db.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    const hashedPassword = await bcrypt.hash(validated.newPassword, 10);

    await db.user.update({
      where: { id: validated.userId },
      data: { password: hashedPassword },
    });

    revalidatePath("/admin/users");

    return { status: "success", data: {} };
  } catch (error) {
    console.error("Admin reset password error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to reset password",
    };
  }
}

/**
 * Admin: Disable user TOTP
 */
export async function adminDisableUserTOTP(
  userId: string,
): Promise<AdminActionResponse<{}>> {
  try {
    await requireAdmin();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, totpEnabled: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    if (!user.totpEnabled) {
      return { status: "error", error: "User does not have TOTP enabled" };
    }

    await db.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpBackupCodes: [],
      },
    });

    revalidatePath("/admin/users");

    return { status: "success", data: {} };
  } catch (error) {
    console.error("Admin disable TOTP error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to disable TOTP",
    };
  }
}

/**
 * Admin: Update user role
 */
const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["USER", "ADMIN"]),
});

export async function adminUpdateUserRole(
  data: z.infer<typeof updateUserRoleSchema>,
): Promise<AdminActionResponse<{}>> {
  try {
    const currentAdmin = await requireAdmin();

    const validated = updateUserRoleSchema.parse(data);

    // Prevent admin from demoting themselves
    if (validated.userId === currentAdmin.id) {
      return {
        status: "error",
        error: "Cannot change your own role",
      };
    }

    const user = await db.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    await db.user.update({
      where: { id: validated.userId },
      data: { role: validated.role },
    });

    revalidatePath("/admin/users");

    return { status: "success", data: {} };
  } catch (error) {
    console.error("Admin update role error:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

/**
 * Admin: Delete user
 */
export async function adminDeleteUser(
  userId: string,
): Promise<AdminActionResponse<{}>> {
  try {
    const currentAdmin = await requireAdmin();

    // Prevent admin from deleting themselves
    if (userId === currentAdmin.id) {
      return {
        status: "error",
        error: "Cannot delete your own account",
      };
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    await db.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");

    return { status: "success", data: {} };
  } catch (error) {
    console.error("Admin delete user error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

"use server";

import { db } from "@/lib/db";

/**
 * Validates if an email is allowed to sign up based on app settings
 */
export async function validateSignupEmail(email: string): Promise<{
  isAllowed: boolean;
  error?: string;
}> {
  try {
    const settings = await db.appSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // If no settings exist or signup restriction is not enabled, allow all
    if (!settings || !settings.restrictSignup) {
      return { isAllowed: true };
    }

    const emailLower = email.toLowerCase();
    const emailDomain = emailLower.split("@")[1];

    // Check if email is in the allowed list
    const allowedEmails = settings.allowedSignupEmails.map((e) =>
      e.toLowerCase(),
    );
    if (allowedEmails.includes(emailLower)) {
      return { isAllowed: true };
    }

    // Check if email domain is in the allowed domains list
    const allowedDomains = settings.allowedSignupDomains.map((d) =>
      d.toLowerCase(),
    );
    if (emailDomain && allowedDomains.includes(emailDomain)) {
      return { isAllowed: true };
    }

    return {
      isAllowed: false,
      error:
        "This email address is not authorized to sign up. Please contact an administrator.",
    };
  } catch (error) {
    console.error("Error validating signup email:", error);
    return { isAllowed: true }; // Allow on error to avoid blocking legitimate users
  }
}

/**
 * Check if user is an admin based on ADMIN_EMAILS environment variable
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",").map((e: string) =>
      e.trim().toLowerCase(),
    ) || [];
  return adminEmails.includes(email.toLowerCase());
}

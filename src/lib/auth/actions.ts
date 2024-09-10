"use server";

// import { revalidatePath } from "next/cache"
// import { redirect } from "next/navigation"
import { differenceInMinutes, format, subDays } from "date-fns";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { UserSigninSchema } from "@/lib/validations/user";
import { signIn as naSignIn, signOut as naSignOut } from ".";

export const signIn = async (provider?: string) => {
  return naSignIn(provider);
};
export const signInCredentials = async (
  values: z.infer<typeof UserSigninSchema>,
) => {
  const validatedFields = UserSigninSchema.safeParse(values);
  if (!validatedFields.success) throw new Error("Invalid fields");

  return naSignIn("credentials", {
    ...validatedFields.data,
    callbackUrl: "/dashboard",
  });
};

export const signInEmail = async (email: string) => {
  // const dbUser = await db.user.findFirst({ where: { email } })
  // if (!dbUser) throw new Error("User not found with " + email)
  const dbToken = await db.verificationToken.findFirst({
    where: { identifier: email },
  });
  if (dbToken) {
    const tokenGenDate = subDays(dbToken?.expires || new Date(), 1);
    const diffMins = differenceInMinutes(new Date(), tokenGenDate);
    if (dbToken && diffMins < siteConfig.emailVerificationDuration)
      throw new Error(
        `Token generated for ${email} at ${format(tokenGenDate, "PP p")}. Try after ${siteConfig.emailVerificationDuration} mins`,
      );
  }
  return naSignIn("resend", { email, redirect: false });
};

export const signOut = async () => {
  await naSignOut();
  // revalidatePath("/")
  // redirect("/")
};

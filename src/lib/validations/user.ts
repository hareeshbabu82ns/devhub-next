import * as z from "zod";
import { siteConfig } from "@/config/site";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(5).max(100),
  email: z.string().email(),
  telephone: z.string().min(10).max(15).optional(),
  image: z.string().default(siteConfig.defaultUserImg).optional(),
  isAdmin: z.boolean().default(false),
});

export const UserInputSchema = UserSchema.omit({ id: true });

export const UserSigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});
export const UserSignupSchema = z.object({
  name: z.string().min(5).max(100),
  email: z.string().email(),
  // password with complex rules
  password: z.string().min(4),
  // password: z
  //   .string()
  //   .refine(
  //     (value) =>
  //       /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{4,}$/.test(
  //         value
  //       ),
  //     {
  //       message:
  //         "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 6 characters long",
  //     }
  //   ),
});

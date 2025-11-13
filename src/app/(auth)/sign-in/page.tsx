"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Icons } from "@/components/utils/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { signInEmail } from "@/lib/auth/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const credentialsSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  totpCode: z.string().optional(),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsTOTP, setNeedsTOTP] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
  });

  const sendEmailToken = async () => {
    try {
      await signInEmail(email);
      toast({
        title: "Token sent",
        description: "Check your email for the magic link token",
      });
    } catch (e) {
      toast({
        title: "Error sending email",
        description: e instanceof Error ? e.message : "Failed to send email",
        variant: "destructive",
      });
    }
  };

  const onCredentialsSubmit = async (values: CredentialsFormValues) => {
    setIsLoading(true);

    try {
      // Only include totpCode if it's actually provided
      const signInData: {
        redirect: false;
        email: string;
        password: string;
        totpCode?: string;
      } = {
        redirect: false,
        email: values.email,
        password: values.password,
      };

      // Only add totpCode if it's provided and not empty
      if (values.totpCode && values.totpCode.trim() !== "") {
        signInData.totpCode = values.totpCode.trim();
      }

      const result = await signIn("credentials", signInData);

      // Check for TOTP_REQUIRED error code
      const resultCode = (result as any)?.code;
      if (resultCode === "TOTP_REQUIRED") {
        setNeedsTOTP(true);
        toast({
          title: "2FA Required",
          description: "Please enter your 6-digit authentication code",
        });
        setIsLoading(false);
        return;
      }

      // Check for error in result
      if (result?.error) {
        // Check for TOTP requirement with various possible error formats
        const errorStr = String(result.error).toUpperCase();

        if (
          result.error === "TOTP_REQUIRED" ||
          errorStr.includes("TOTP_REQUIRED") ||
          errorStr.includes("TOTP") ||
          errorStr.includes("2FA")
        ) {
          setNeedsTOTP(true);
          toast({
            title: "2FA Required",
            description: "Please enter your 6-digit authentication code",
          });
          setIsLoading(false);
          return;
        }

        // Show error toast for other errors
        toast({
          title: "Sign in failed",
          description: result.error,
          variant: "destructive",
        });
      } else if (result?.ok) {
        toast({
          title: "Success!",
          description: "You've been signed in successfully",
        });
        router.push("/dashboard");
        router.refresh();
      } else {
        // No error and not ok - unexpected state
        console.log("Unexpected result state:", result);
      }
    } catch (error) {
      // Check if the exception is TOTP related
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStr = errorMessage.toUpperCase();

      if (
        errorMessage === "TOTP_REQUIRED" ||
        errorStr.includes("TOTP_REQUIRED") ||
        errorStr.includes("TOTP") ||
        errorStr.includes("2FA")
      ) {
        setNeedsTOTP(true);
        toast({
          title: "2FA Required",
          description: "Please enter your 6-digit authentication code",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard title="Sign In" description="Sign in to your account to continue">
      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="credentials">Password</TabsTrigger>
          <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <form onSubmit={handleSubmit(onCredentialsSubmit)}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cred-email">Email</Label>
                <Input
                  id="cred-email"
                  type="email"
                  placeholder="m@example.com"
                  disabled={isLoading}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm underline hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {needsTOTP && (
                <div className="grid gap-2">
                  <Label htmlFor="totpCode">Authentication Code</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    disabled={isLoading}
                    {...register("totpCode")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign in
              </Button>

              <AuthDivider />

              <SocialSignIn mode="signin" />
            </div>
          </form>
        </TabsContent>

        <TabsContent value="magic-link" className="space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-row gap-2">
              <div className="grid grow gap-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="h-3"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={sendEmailToken}
                  title="Send Token"
                >
                  <Icons.email className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-row gap-2">
              <div className="grid grow gap-2">
                <Label htmlFor="emailToken">Token</Label>
                <Input
                  id="emailToken"
                  type="text"
                  placeholder="Enter token from email"
                  value={emailToken}
                  onChange={(e) => setEmailToken(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="h-3"></div>
                <Link
                  title="Login with Token"
                  href={
                    emailToken && email
                      ? `/api/auth/callback/resend?callbackUrl=/dashboard&token=${emailToken}&email=${email}`
                      : ""
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  <Icons.login className="size-4" />
                </Link>
              </div>
            </div>

            <AuthDivider />

            <SocialSignIn mode="signin" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="underline hover:text-primary">
          Sign up
        </Link>
      </div>
    </AuthCard>
  );
}

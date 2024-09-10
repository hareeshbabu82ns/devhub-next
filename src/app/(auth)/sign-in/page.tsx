"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Icons } from "@/components/utils/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { signInEmail } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const { toast } = useToast();

  const sendEmailToken = async () => {
    try {
      await signInEmail(email);
      toast({
        title:
          "Token sent to email, if not received in 15min please contact Admin",
      });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Error sending email",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="min-w-lg m-auto rounded-lg p-2 md:min-w-[500px]">
      <CardHeader>
        <div className="flex items-center justify-center pb-2">
          <Avatar className="size-16">
            <AvatarImage src="/icon-192.png" />
            <AvatarFallback>Logo</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          eMail login currently only supported on browsers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex flex-row gap-2">
            <div className="grid grow gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
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
                type="emailToken"
                placeholder="Enter Token from email"
                required
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
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                )}
              >
                <Icons.login className="size-4" />
              </Link>
            </div>
          </div>

          {/* divider */}
          <div className="flex w-full items-center py-4">
            <div className="bg-primary h-px flex-1" />
            <span className="text-primary px-2 text-sm">
              <Icons.login className="size-4" />
            </span>
            <div className="bg-primary h-px flex-1" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google")}
          >
            Login with Google
          </Button>
        </div>
        {/* <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="underline">
            Sign up
          </Link>
        </div> */}
      </CardContent>
    </Card>
  );
}

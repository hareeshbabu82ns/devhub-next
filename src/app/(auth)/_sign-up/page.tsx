"use client";
import { LockKeyholeIcon } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupForm() {
  return (
    <Card className="min-w-lg m-auto rounded-lg p-2 md:min-w-[500px]">
      <CardHeader>
        <div className="flex items-center justify-center pb-2">
          <Avatar className="size-16">
            <AvatarImage src="/icon-192.png" />
            <AvatarFallback>Logo</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input id="full-name" placeholder="Full Name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" />
          </div>
          <Button type="submit" className="w-full">
            Create an account
          </Button>
          {/* divider */}
          <div className="flex w-full items-center py-4">
            <div className="bg-primary h-px flex-1" />
            <span className="text-primary px-2 text-sm">
              <LockKeyholeIcon className="size-4" />
            </span>
            <div className="bg-primary h-px flex-1" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google")}
          >
            Sign up with Google
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

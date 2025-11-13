"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icons } from "@/components/utils/icons";
import { setupTOTP, enableTOTP } from "@/app/actions/totp-actions";

interface TOTPSetupFlowProps {
  onComplete?: () => void;
}

export function TOTPSetupFlow({ onComplete }: TOTPSetupFlowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<"generate" | "verify" | "backup">(
    "generate",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleGenerateQR = async () => {
    setIsLoading(true);
    try {
      const result = await setupTOTP();

      if (result.status === "success") {
        setQrCodeUrl(result.data.qrCode);
        setSecret(result.data.secret);
        setBackupCodes(result.data.backupCodes);
        setStep("verify");
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (!secret || backupCodes.length === 0) {
      toast({
        title: "Error",
        description: "Missing setup data. Please start over.",
        variant: "destructive",
      });
      setStep("generate");
      return;
    }

    setIsLoading(true);
    try {
      const result = await enableTOTP({
        secret,
        token: verificationCode,
        backupCodes,
      });

      if (result.status === "success") {
        setStep("backup");
        toast({
          title: "Success!",
          description: "Two-factor authentication has been enabled",
        });
      } else {
        toast({
          title: "Verification failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push("/settings/security");
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast({
      title: "Copied!",
      description: "Backup codes copied to clipboard",
    });
  };

  return (
    <>
      {step === "generate" && (
        <>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Add an extra layer of security to your account by requiring a
              verification code in addition to your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <Icons.help className="h-4 w-4" />
              <AlertDescription>
                You'll need an authenticator app like Google Authenticator,
                Authy, or 1Password to scan the QR code.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              onClick={handleGenerateQR}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate QR Code
            </Button>
          </DialogFooter>
        </>
      )}

      {step === "verify" && (
        <>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app, then enter the
              6-digit code to verify.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {qrCodeUrl && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  <Image
                    src={qrCodeUrl}
                    alt="TOTP QR Code"
                    width={200}
                    height={200}
                    className="w-48 h-48"
                  />
                </div>

                <div className="w-full text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                    {secret}
                  </code>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ""))
                }
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col space-y-2 sm:flex-col sm:space-y-2">
            <Button
              onClick={handleVerifyAndEnable}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full"
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify and Enable
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStep("generate")}
              className="w-full"
            >
              Back
            </Button>
          </DialogFooter>
        </>
      )}

      {step === "backup" && (
        <>
          <DialogHeader>
            <DialogTitle>Save Your Backup Codes</DialogTitle>
            <DialogDescription>
              Store these backup codes in a safe place. You can use them to
              access your account if you lose your authenticator device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <Icons.warning className="h-4 w-4" />
              <AlertDescription>
                Each backup code can only be used once. Keep them secure and
                don't share them with anyone.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col space-y-2 sm:flex-col sm:space-y-2">
            <Button
              onClick={copyBackupCodes}
              variant="outline"
              className="w-full"
            >
              <Icons.clipboard className="mr-2 h-4 w-4" />
              Copy Codes
            </Button>
            <Button onClick={handleComplete} className="w-full">
              I've Saved My Codes
            </Button>
          </DialogFooter>
        </>
      )}
    </>
  );
}

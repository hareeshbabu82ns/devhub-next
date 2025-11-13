"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Icons } from "@/components/utils/icons";
import { TOTPSetupFlow } from "@/components/auth/totp-setup-flow";
import {
  getUserSecuritySettings,
  changePassword,
  userDisableTOTP,
  regenerateBackupCodes,
} from "@/app/actions/user-actions";
import { useSearchParams } from "next/navigation";

export default function SecuritySettingsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [email, setEmail] = useState("");

  // Dialog states
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [disableTotpDialog, setDisableTotpDialog] = useState(false);
  const [regenerateCodesDialog, setRegenerateCodesDialog] = useState(false);
  const [enableTotpDialog, setEnableTotpDialog] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [disableTotpPassword, setDisableTotpPassword] = useState("");
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSettings();

    // Check if we should auto-open TOTP setup
    const setupTotp = searchParams?.get("setup-totp");
    if (setupTotp === "true") {
      setEnableTotpDialog(true);
    }
  }, [searchParams]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await getUserSecuritySettings();

      if (result.status === "success") {
        setHasPassword(result.data.hasPassword);
        setTotpEnabled(result.data.totpEnabled);
        setEmail(result.data.email || "");
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
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setChangePasswordDialog(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
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
        description: "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableTOTP = async () => {
    if (!disableTotpPassword) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await userDisableTOTP({ password: disableTotpPassword });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: "Two-factor authentication disabled",
        });
        setDisableTotpDialog(false);
        setDisableTotpPassword("");
        loadSettings();
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
        description: "Failed to disable TOTP",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await regenerateBackupCodes({
        password: regeneratePassword,
      });

      if (result.status === "success") {
        setBackupCodes(result.data.backupCodes);
        toast({
          title: "Success",
          description: "Backup codes regenerated successfully",
        });
        setRegeneratePassword("");
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
        description: "Failed to regenerate codes",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast({
      title: "Copied!",
      description: "Backup codes copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your password and two-factor authentication
        </p>
      </div>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            {hasPassword
              ? "Change your account password"
              : "No password set for this account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPassword ? (
            <Button onClick={() => setChangePasswordDialog(true)}>
              <Icons.edit className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your account uses OAuth authentication only.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Two-Factor Authentication
            {totpEnabled && (
              <Badge variant="outline" className="bg-green-50">
                <Icons.check className="mr-1 h-3 w-3" />
                Enabled
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totpEnabled ? (
            <>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is currently enabled for your account.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setRegenerateCodesDialog(true)}
                  variant="outline"
                >
                  <Icons.refresh className="mr-2 h-4 w-4" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  onClick={() => setDisableTotpDialog(true)}
                  variant="destructive"
                >
                  <Icons.close className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security to
                your account.
              </p>
              <Button onClick={() => setEnableTotpDialog(true)}>
                <Icons.add className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordDialog}
        onOpenChange={setChangePasswordDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangePasswordDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isProcessing}>
              {isProcessing && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable TOTP Dialog */}
      <Dialog open={disableTotpDialog} onOpenChange={setDisableTotpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to disable 2FA. This will make your account
              less secure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-totp-password">Password</Label>
              <Input
                id="disable-totp-password"
                type="password"
                value={disableTotpPassword}
                onChange={(e) => setDisableTotpPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisableTotpDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableTOTP}
              disabled={isProcessing}
            >
              {isProcessing && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog
        open={regenerateCodesDialog}
        onOpenChange={(open) => {
          setRegenerateCodesDialog(open);
          if (!open) {
            // Reset state when dialog closes
            setRegeneratePassword("");
            setBackupCodes([]);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {backupCodes.length === 0
                ? "Regenerate Backup Codes"
                : "Your New Backup Codes"}
            </DialogTitle>
            <DialogDescription>
              {backupCodes.length === 0
                ? "Generate new backup codes. Old codes will no longer work."
                : "Save these codes in a secure location. Each code can only be used once."}
            </DialogDescription>
          </DialogHeader>
          {backupCodes.length === 0 ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="regenerate-password">Password</Label>
                  <Input
                    id="regenerate-password"
                    type="password"
                    value={regeneratePassword}
                    onChange={(e) => setRegeneratePassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRegenerateCodesDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateBackupCodes}
                  disabled={isProcessing || !regeneratePassword}
                >
                  {isProcessing && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate Codes
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <Alert>
                  <Icons.warning className="h-4 w-4" />
                  <AlertDescription>
                    Make sure to copy these codes before closing this dialog.
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
                  Copy All Codes
                </Button>
                <Button
                  onClick={() => setRegenerateCodesDialog(false)}
                  className="w-full"
                >
                  I've Saved My Codes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Enable TOTP Dialog */}
      <Dialog open={enableTotpDialog} onOpenChange={setEnableTotpDialog}>
        <DialogContent className="max-w-md">
          <TOTPSetupFlow
            onComplete={() => {
              setEnableTotpDialog(false);
              loadSettings();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { useToast } from "@/components/ui/use-toast";
import { Icons } from "@/components/utils/icons";
import { TOTPSetupFlow } from "@/components/auth/totp-setup-flow";
import {
  getUserProfile,
  updateUserProfile,
  createPassword,
  changePassword,
  userDisableTOTP,
  regenerateBackupCodes,
} from "@/app/actions/user-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarAltName } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useSearchParams } from "next/navigation";

export default function ProfileSettingsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // User data
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [emailVerified, setEmailVerified] = useState<Date | null>(null);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);

  // Dialog states
  const [editProfileDialog, setEditProfileDialog] = useState(false);
  const [createPasswordDialog, setCreatePasswordDialog] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [enableTotpDialog, setEnableTotpDialog] = useState(false);
  const [disableTotpDialog, setDisableTotpDialog] = useState(false);
  const [regenerateCodesDialog, setRegenerateCodesDialog] = useState(false);

  // Form states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [disableTotpPassword, setDisableTotpPassword] = useState("");
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadProfile();

    // Check if we should auto-open TOTP setup
    const setupTotp = searchParams?.get("setup-totp");
    if (setupTotp === "true") {
      setEnableTotpDialog(true);
    }
  }, [searchParams]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const result = await getUserProfile();

      if (result.status === "success") {
        setUserId(result.data.id);
        setName(result.data.name || "");
        setEmail(result.data.email || "");
        setImage(result.data.image || "");
        setHasPassword(result.data.hasPassword);
        setTotpEnabled(result.data.totpEnabled);
        setEmailVerified(result.data.emailVerified);
        setCreatedAt(result.data.createdAt);
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
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await updateUserProfile({
        name: editName,
        email: editEmail || undefined,
      });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        setEditProfileDialog(false);
        loadProfile();
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
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePassword = async () => {
    if (!newPassword || !confirmPassword) {
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
      const result = await createPassword({
        newPassword,
        confirmPassword,
      });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: "Password created successfully",
        });
        setCreatePasswordDialog(false);
        setNewPassword("");
        setConfirmPassword("");
        loadProfile();
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
        description: "Failed to create password",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

  const handleDisableTotp = async () => {
    if (!disableTotpPassword) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await userDisableTOTP({
        password: disableTotpPassword,
      });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: "Two-factor authentication disabled",
        });
        setDisableTotpDialog(false);
        setDisableTotpPassword("");
        loadProfile();
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
        description: "Password is required",
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
        toast({
          title: "Success",
          description: "Backup codes regenerated",
        });
        setBackupCodes(result.data.backupCodes);
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
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Manage your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={image} alt={name} />
              <AvatarFallback className="text-2xl">
                {avatarAltName(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{email}</p>
              {emailVerified && (
                <Badge variant="outline" className="mt-1 bg-green-50">
                  <Icons.check className="mr-1 h-3 w-3" />
                  Email Verified
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setEditName(name);
                setEditEmail(email);
                setEditProfileDialog(true);
              }}
            >
              <Icons.edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          <Separator />

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-xs">{userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since:</span>
              <span>
                {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Manage your password for signing in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Icons.login className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {hasPassword ? "Password Set" : "No Password"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasPassword
                    ? "You can sign in with your password"
                    : "Set a password to enable password login"}
                </p>
              </div>
            </div>
            {hasPassword ? (
              <Button
                variant="outline"
                onClick={() => setChangePasswordDialog(true)}
              >
                Change Password
              </Button>
            ) : (
              <Button onClick={() => setCreatePasswordDialog(true)}>
                Create Password
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Icons.login className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {totpEnabled ? "2FA Enabled" : "2FA Disabled"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {totpEnabled
                    ? "Your account is protected with 2FA"
                    : "Enable 2FA for enhanced security"}
                </p>
              </div>
            </div>
            {totpEnabled ? (
              <Badge variant="default" className="bg-green-600">
                <Icons.check className="mr-1 h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>

          {totpEnabled ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDisableTotpDialog(true)}
                className="flex-1"
              >
                <Icons.close className="mr-2 h-4 w-4" />
                Disable 2FA
              </Button>
              <Button
                variant="outline"
                onClick={() => setRegenerateCodesDialog(true)}
                className="flex-1"
              >
                <Icons.refresh className="mr-2 h-4 w-4" />
                Regenerate Codes
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setEnableTotpDialog(true)}
              disabled={!hasPassword}
              className="w-full"
            >
              <Icons.login className="mr-2 h-4 w-4" />
              Enable Two-Factor Authentication
            </Button>
          )}

          {!hasPassword && !totpEnabled && (
            <p className="text-sm text-muted-foreground">
              <Icons.warning className="mr-1 inline h-4 w-4" />
              You need to set a password before enabling 2FA
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialog} onOpenChange={setEditProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditProfileDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isProcessing}>
              {isProcessing && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Password Dialog */}
      <Dialog
        open={createPasswordDialog}
        onOpenChange={setCreatePasswordDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Password</DialogTitle>
            <DialogDescription>
              Set a password to enable password-based login
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreatePasswordDialog(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePassword} disabled={isProcessing}>
              {isProcessing && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordDialog}
        onOpenChange={setChangePasswordDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Update your account password</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="new-password-change">New Password</Label>
              <Input
                id="new-password-change"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password-change">Confirm Password</Label>
              <Input
                id="confirm-password-change"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialog(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isProcessing}
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

      {/* Enable TOTP Dialog */}
      <Dialog open={enableTotpDialog} onOpenChange={setEnableTotpDialog}>
        <DialogContent className="max-w-2xl">
          <TOTPSetupFlow
            onComplete={() => {
              setEnableTotpDialog(false);
              loadProfile();
            }}
          />
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
          <div>
            <Label htmlFor="disable-totp-password">Password</Label>
            <Input
              id="disable-totp-password"
              type="password"
              value={disableTotpPassword}
              onChange={(e) => setDisableTotpPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDisableTotpDialog(false);
                setDisableTotpPassword("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableTotp}
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
            setBackupCodes([]);
            setRegeneratePassword("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              {backupCodes.length === 0
                ? "Enter your password to generate new backup codes"
                : "Save these codes in a safe place"}
            </DialogDescription>
          </DialogHeader>

          {backupCodes.length === 0 ? (
            <div>
              <Label htmlFor="regenerate-password">Password</Label>
              <Input
                id="regenerate-password"
                type="password"
                value={regeneratePassword}
                onChange={(e) => setRegeneratePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="font-mono text-sm space-y-1">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {(index + 1).toString().padStart(2, "0")}.
                      </span>
                      <code className="flex-1">{code}</code>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={copyBackupCodes}
                className="w-full"
              >
                <Icons.clipboard className="mr-2 h-4 w-4" />
                Copy Codes
              </Button>
              <p className="text-sm text-muted-foreground">
                <Icons.warning className="mr-1 inline h-4 w-4" />
                These codes will only be shown once. Save them securely!
              </p>
            </div>
          )}

          <DialogFooter>
            {backupCodes.length === 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRegenerateCodesDialog(false);
                    setRegeneratePassword("");
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateBackupCodes}
                  disabled={isProcessing}
                >
                  {isProcessing && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate Codes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setRegenerateCodesDialog(false);
                  setBackupCodes([]);
                  setRegeneratePassword("");
                }}
                className="w-full"
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

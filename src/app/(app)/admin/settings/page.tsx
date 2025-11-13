"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Icons } from "@/components/utils/icons";
import { Badge } from "@/components/ui/badge";
import { getAppSettings, updateAppSettings } from "@/app/actions/admin-actions";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [restrictSignup, setRestrictSignup] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);

  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await getAppSettings();

      if (result.status === "success") {
        setRestrictSignup(result.data.restrictSignup);
        setAllowedEmails(result.data.allowedSignupEmails);
        setAllowedDomains(result.data.allowedSignupDomains);
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateAppSettings({
        restrictSignup,
        allowedSignupEmails: allowedEmails,
        allowedSignupDomains: allowedDomains,
      });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: "Settings updated successfully",
        });
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
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (allowedEmails.includes(email)) {
      toast({
        title: "Duplicate",
        description: "This email is already in the list",
        variant: "destructive",
      });
      return;
    }

    setAllowedEmails([...allowedEmails, email]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setAllowedEmails(allowedEmails.filter((e) => e !== email));
  };

  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;

    // Basic domain validation
    if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }

    if (allowedDomains.includes(domain)) {
      toast({
        title: "Duplicate",
        description: "This domain is already in the list",
        variant: "destructive",
      });
      return;
    }

    setAllowedDomains([...allowedDomains, domain]);
    setNewDomain("");
  };

  const removeDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">
            Manage application settings and signup restrictions
          </p>
        </div>
        <Button onClick={() => router.push("/admin/users")} variant="outline">
          <Icons.user className="mr-2 h-4 w-4" />
          Manage Users
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signup Restrictions</CardTitle>
          <CardDescription>
            Control who can sign up for new accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="restrict-signup">Restrict Signups</Label>
              <p className="text-sm text-muted-foreground">
                Only allow specific emails or domains to sign up
              </p>
            </div>
            <Switch
              id="restrict-signup"
              checked={restrictSignup}
              onCheckedChange={setRestrictSignup}
            />
          </div>

          {restrictSignup && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="allowed-emails">
                    Allowed Email Addresses
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Specific email addresses that can sign up
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="allowed-emails"
                      type="email"
                      placeholder="user@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addEmail()}
                    />
                    <Button onClick={addEmail} variant="outline">
                      <Icons.add className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {allowedEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button
                          onClick={() => removeEmail(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <Icons.close className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {allowedEmails.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No emails added yet
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="allowed-domains">Allowed Domains</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Email domains that can sign up (e.g., company.com)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="allowed-domains"
                      type="text"
                      placeholder="example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDomain()}
                    />
                    <Button onClick={addDomain} variant="outline">
                      <Icons.add className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {allowedDomains.map((domain) => (
                      <Badge key={domain} variant="secondary" className="gap-1">
                        {domain}
                        <button
                          onClick={() => removeDomain(domain)}
                          className="ml-1 hover:text-destructive"
                        >
                          <Icons.close className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {allowedDomains.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No domains added yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

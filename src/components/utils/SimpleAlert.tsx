"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SimpleAlert({
  title,
  extraMessages,
  variant = "destructive",
}: {
  title: string;
  extraMessages?: string[];
  variant?:
    | "default"
    | "destructive"
    | "success"
    | "warning"
    | "primary"
    | "secondary"
    | null
    | undefined;
}) {
  return (
    <Alert variant={variant}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      {extraMessages?.map((m, i) => (
        <AlertDescription key={i}>{m}</AlertDescription>
      ))}
    </Alert>
  );
}

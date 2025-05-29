"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ScraperWizardStep } from "./scraper-context";

// Status Alert Component
export interface StatusAlertProps {
  type: "success" | "error";
  title?: string;
  message: string;
  className?: string;
}

export const StatusAlert: React.FC<StatusAlertProps> = ({
  type,
  title,
  message,
  className,
}) => {
  return (
    <Alert
      variant={type === "success" ? "default" : "destructive"}
      className={className}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle>
        {title || (type === "success" ? "Success" : "Error")}
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

// Wizard Progress Indicator Component
export interface WizardProgressIndicatorProps {
  currentStep: ScraperWizardStep;
}

export const WizardProgressIndicator: React.FC<
  WizardProgressIndicatorProps
> = ({ currentStep }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <div className="text-center flex-1">
          <div
            className={`mt-2 text-sm font-medium ${
              currentStep >= ScraperWizardStep.ScrapeHTML
                ? "bg-primary text-primary-foreground border-primary"
                : "border-muted bg-muted text-muted-foreground"
            }`}
          >
            1. Scrape HTML
          </div>
        </div>
        <div className="text-center flex-1">
          <div
            className={`mt-2 text-sm font-medium ${
              currentStep >= ScraperWizardStep.ProcessJSON
                ? "bg-primary text-primary-foreground border-primary"
                : "border-muted bg-muted text-muted-foreground"
            }`}
          >
            2. Process JSON
          </div>
        </div>
        <div className="text-center flex-1">
          <div
            className={`mt-2 text-sm font-medium ${
              currentStep >= ScraperWizardStep.CreateEntity
                ? "bg-primary text-primary-foreground border-primary"
                : "border-muted bg-muted text-muted-foreground"
            }`}
          >
            3. Create Entity
          </div>
        </div>
      </div>
      <div className="relative w-full h-2 bg-muted rounded-full">
        <div
          className="absolute top-0 left-0 h-2 bg-primary rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 2) * 100}%` }}
        />
      </div>
    </div>
  );
};

// Loading Button Content
export interface LoadingButtonContentProps {
  isLoading: boolean;
  loadingText: string;
  icon: React.ReactNode;
  text: string;
}

export const LoadingButtonContent: React.FC<LoadingButtonContentProps> = ({
  isLoading,
  loadingText,
  icon,
  text,
}) => {
  return (
    <>
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText}
        </>
      ) : (
        <>
          {icon}
          {text}
        </>
      )}
    </>
  );
};

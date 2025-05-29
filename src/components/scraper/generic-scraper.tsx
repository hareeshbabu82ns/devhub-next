"use client";

import React from "react";
import {
  ScraperProvider,
  ScraperWizardStep,
  ScraperFunction,
  SaveJsonFunction,
  ConvertFunction,
  UploadFunction,
} from "./scraper-context";
import { WizardProgressIndicator } from "./scraper-ui-components";
import { ScraperStepOne } from "./scraper-step-one";
import { ScraperStepTwo } from "./scraper-step-two";
import { ScraperStepThree } from "./scraper-step-three";
import { z } from "zod";
import { useScraperContext } from "./scraper-context";
import config from "@/config";

// Props interface for the generic scraper component
export interface GenericScraperProps {
  formSchema?: z.ZodType<any, any>;
  defaultValues?: any;
  title?: string;
  description?: string;
  scraperFunction?: ScraperFunction;
  saveJsonFunction?: SaveJsonFunction;
  convertFunction?: ConvertFunction;
  uploadFunction?: UploadFunction;
  additionalFields?: React.ReactNode;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

// Main component with all steps
const ScraperContent: React.FC = () => {
  const { currentStep, title, description } = useScraperContext();

  return (
    <div className="flex-1 space-y-6 flex flex-col gap-1">
      <div className="prose">
        <h3>{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Wizard Progress Indicator */}
      <WizardProgressIndicator currentStep={currentStep} />

      {/* Step 1: Scrape HTML */}
      {currentStep === ScraperWizardStep.ScrapeHTML && <ScraperStepOne />}

      {/* Step 2: Process JSON */}
      {currentStep === ScraperWizardStep.ProcessJSON && <ScraperStepTwo />}

      {/* Step 3: Create Entity */}
      {currentStep === ScraperWizardStep.CreateEntity && <ScraperStepThree />}
    </div>
  );
};

// Main exported component with provider
export function GenericScraper({
  formSchema,
  defaultValues = {
    url: "",
    selectors: [".content", "h1", "p"],
    outputPath: `${config.dataFolder}/scrape/output.json`,
    refetch: false,
    entityType: "verse",
    parentId: "",
  },
  title = "Generic Web Scraper",
  description = "Extract content from any website using CSS selectors, edit the JSON, and convert to database entities",
  scraperFunction,
  saveJsonFunction,
  convertFunction,
  uploadFunction,
  additionalFields,
  onSuccess,
  onError,
}: GenericScraperProps) {
  return (
    <ScraperProvider
      formSchema={formSchema}
      defaultValues={defaultValues}
      title={title}
      description={description}
      scraperFunction={scraperFunction}
      saveJsonFunction={saveJsonFunction}
      convertFunction={convertFunction}
      uploadFunction={uploadFunction}
      additionalFields={additionalFields}
      onSuccess={onSuccess}
      onError={onError}
    >
      <ScraperContent />
    </ScraperProvider>
  );
}

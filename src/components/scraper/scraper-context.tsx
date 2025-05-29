"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import config from "@/config";

// Enum for wizard steps
export enum ScraperWizardStep {
  ScrapeHTML = 0,
  ProcessJSON = 1,
  CreateEntity = 2,
}

// Function type definitions
export type ScraperFunction = (
  url: string,
  selectors: string[],
  outputPath: string,
  refetch: boolean,
) => Promise<{
  success: boolean;
  data: any;
  folderPath: string;
  htmlFilePath: string;
  jsonFilePath: string;
}>;

export type SaveJsonFunction = (
  jsonFilePath: string,
  content: any,
) => Promise<{ success: boolean; message: string }>;

export type ConvertFunction = (
  jsonFilePath: string,
  entityType: string,
  parentId?: string,
) => Promise<{
  success: boolean;
  entities: any[];
  count: number;
  message: string;
  previewFilePath: string;
}>;

export type UploadFunction = (
  jsonFilePath: string,
  entityType: string,
  parentId?: string,
) => Promise<{
  success: boolean;
  message: string;
  count: number;
}>;

// Default form schema
export const defaultFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  selectors: z
    .array(z.string().min(1, "Selector cannot be empty"))
    .min(1, "At least one selector is required"),
  outputPath: z.string().min(1, "Output path is required"),
  refetch: z.boolean().default(false),
  entityType: z.string().default("verse"),
  parentId: z.string().optional(),
});

// Function to generate safe file name from URL
export const getSafePathFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pageName =
      urlObj.hostname + urlObj.pathname.replace(/[^a-z0-9]/gi, "_");
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 14); // yyyyMMddHHmmss
    const folderName = `${pageName}`;
    return `${config.dataFolder}/scrape/${folderName}/extracted_${timestamp}.json`;
  } catch (error) {
    // If URL is invalid, return default path
    return `${config.dataFolder}/scrape/output.json`;
  }
};

// Context type
type ScraperContextType = {
  // State
  currentStep: ScraperWizardStep;
  isLoading: boolean;
  isUploading: boolean;
  isSavingJson: boolean;
  isConvertingToEntity: boolean;
  status: {
    type: "success" | "error";
    message: string;
    data?: any;
    folderPath?: string;
    htmlFilePath?: string;
    jsonFilePath?: string;
    step?: ScraperWizardStep;
  } | null;
  uploadStatus: {
    type: "success" | "error";
    message: string;
    count?: number;
  } | null;
  saveJsonStatus: {
    type: "success" | "error";
    message: string;
  } | null;
  convertStatus: {
    type: "success" | "error";
    message: string;
    entities?: any[];
    previewFilePath?: string;
  } | null;
  newSelector: string;
  editedJsonContent: string;
  entityPreviewContent: string;

  // Form
  form: any;

  // Functions
  setNewSelector: (value: string) => void;
  setEditedJsonContent: (value: string) => void;
  setEntityPreviewContent: (value: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: ScraperWizardStep) => void;
  addSelector: () => void;
  removeSelector: (index: number) => void;
  onScrape: (values: any) => Promise<void>;
  onSaveEditedJson: () => Promise<void>;
  onConvertToEntityFormat: () => Promise<void>;
  onUploadEntityPreviewToDatabase: () => Promise<void>;

  // Props
  scraperFunction?: ScraperFunction;
  saveJsonFunction?: SaveJsonFunction;
  convertFunction?: ConvertFunction;
  uploadFunction?: UploadFunction;
  additionalFields?: React.ReactNode;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  title: string;
  description: string;
};

// Default context value
const defaultContext: ScraperContextType = {
  currentStep: ScraperWizardStep.ScrapeHTML,
  isLoading: false,
  isUploading: false,
  isSavingJson: false,
  isConvertingToEntity: false,
  status: null,
  uploadStatus: null,
  saveJsonStatus: null,
  convertStatus: null,
  newSelector: "",
  editedJsonContent: "",
  entityPreviewContent: "",
  form: null,
  setNewSelector: () => {},
  setEditedJsonContent: () => {},
  setEntityPreviewContent: () => {},
  goToNextStep: () => {},
  goToPreviousStep: () => {},
  goToStep: () => {},
  addSelector: () => {},
  removeSelector: () => {},
  onScrape: async () => {},
  onSaveEditedJson: async () => {},
  onConvertToEntityFormat: async () => {},
  onUploadEntityPreviewToDatabase: async () => {},
  title: "Generic Web Scraper",
  description:
    "Extract content from any website using CSS selectors, edit the JSON, and convert to database entities",
};

// Create context
const ScraperContext = createContext<ScraperContextType>(defaultContext);

// Props for the provider
export interface ScraperProviderProps {
  children: React.ReactNode;
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

// Provider component
export const ScraperProvider: React.FC<ScraperProviderProps> = ({
  children,
  formSchema = defaultFormSchema,
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
}) => {
  // Wizard step state
  const [currentStep, setCurrentStep] = useState<ScraperWizardStep>(
    ScraperWizardStep.ScrapeHTML,
  );

  // Operation states
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [isConvertingToEntity, setIsConvertingToEntity] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
    data?: any;
    folderPath?: string;
    htmlFilePath?: string;
    jsonFilePath?: string;
    step?: ScraperWizardStep;
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error";
    message: string;
    count?: number;
  } | null>(null);
  const [saveJsonStatus, setSaveJsonStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [convertStatus, setConvertStatus] = useState<{
    type: "success" | "error";
    message: string;
    entities?: any[];
    previewFilePath?: string;
  } | null>(null);
  const [newSelector, setNewSelector] = useState("");
  const [editedJsonContent, setEditedJsonContent] = useState("");
  const [entityPreviewContent, setEntityPreviewContent] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Watch for URL changes and update the output path
  const watchedUrl = form.watch("url");

  useEffect(() => {
    // Only update if the URL is valid
    if (watchedUrl && watchedUrl.startsWith("http")) {
      const newPath = getSafePathFromUrl(watchedUrl);
      form.setValue("outputPath", newPath);
    }
  }, [watchedUrl, form]);

  // Update editedJsonContent when status.data changes
  useEffect(() => {
    if (status?.data) {
      setEditedJsonContent(JSON.stringify(status.data, null, 2));
    }
  }, [status?.data]);

  const goToNextStep = () => {
    // Ensure form values are properly maintained between steps
    form.trigger();

    setCurrentStep((prev) => {
      const nextStep = prev + 1;
      return nextStep <= ScraperWizardStep.CreateEntity ? nextStep : prev;
    });
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => {
      const prevStep = prev - 1;
      return prevStep >= ScraperWizardStep.ScrapeHTML ? prevStep : prev;
    });
  };

  const goToStep = (step: ScraperWizardStep) => {
    if (
      step >= ScraperWizardStep.ScrapeHTML &&
      step <= ScraperWizardStep.CreateEntity
    ) {
      // Validate current form state before changing steps
      form.trigger();
      setCurrentStep(step);
    }
  };

  const addSelector = () => {
    if (newSelector.trim()) {
      const currentSelectors = form.getValues().selectors;
      form.setValue("selectors", [...currentSelectors, newSelector.trim()]);
      setNewSelector("");
    }
  };

  const removeSelector = (index: number) => {
    const currentSelectors = form.getValues().selectors;
    form.setValue(
      "selectors",
      currentSelectors.filter((_: any, i: number) => i !== index),
    );
  };

  async function onScrape(values: any) {
    setIsLoading(true);
    setStatus(null);
    setUploadStatus(null);
    setSaveJsonStatus(null);
    setConvertStatus(null);

    try {
      // Use the provided scraper function or throw an error if none is available
      if (!scraperFunction) {
        throw new Error("No scraper function provided");
      }

      const result = await scraperFunction(
        values.url,
        values.selectors,
        values.outputPath,
        values.refetch,
      );

      setStatus({
        type: "success",
        message: `Successfully scraped content from ${values.url} and saved to ${result.folderPath}`,
        data: result.data,
        folderPath: result.folderPath,
        htmlFilePath: result.htmlFilePath,
        jsonFilePath: result.jsonFilePath,
        step: ScraperWizardStep.ScrapeHTML,
      });

      // Auto-advance to the next step
      goToNextStep();

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to scrape URL",
      });

      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onSaveEditedJson() {
    if (!status?.jsonFilePath || !editedJsonContent || !saveJsonFunction)
      return;

    setIsSavingJson(true);
    setSaveJsonStatus(null);

    try {
      // Parse the edited JSON to validate it
      const parsedJson = JSON.parse(editedJsonContent);

      const result = await saveJsonFunction(status.jsonFilePath, parsedJson);

      // Update the status data with the edited content
      setStatus({
        ...status,
        data: parsedJson,
      });

      setSaveJsonStatus({
        type: "success",
        message: result.message,
      });
    } catch (error) {
      setSaveJsonStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save edited JSON. Make sure it's valid JSON.",
      });
    } finally {
      setIsSavingJson(false);
    }
  }

  async function onConvertToEntityFormat() {
    if (!status?.jsonFilePath || !convertFunction) return;

    setIsConvertingToEntity(true);
    setConvertStatus(null);

    try {
      const entityType = form.getValues().entityType;
      const parentId = form.getValues().parentId;

      const result = await convertFunction(
        status.jsonFilePath,
        entityType,
        parentId || undefined,
      );

      setConvertStatus({
        type: "success",
        message: result.message,
        entities: result.entities,
        previewFilePath: result.previewFilePath,
      });

      // Set the entity preview content
      setEntityPreviewContent(JSON.stringify(result.entities, null, 2));

      // Auto-advance to the next step
      goToNextStep();

      // Clear any previous status messages
      setSaveJsonStatus(null);
      setUploadStatus(null);
    } catch (error) {
      setConvertStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to convert to entity format",
      });
    } finally {
      setIsConvertingToEntity(false);
    }
  }

  async function onUploadEntityPreviewToDatabase() {
    if (!convertStatus?.previewFilePath || !uploadFunction) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      // First, ensure we save any edits to the entity preview
      try {
        const parsedContent = JSON.parse(entityPreviewContent);
        if (saveJsonFunction) {
          await saveJsonFunction(convertStatus.previewFilePath, parsedContent);
        }
      } catch (error) {
        throw new Error(
          `Invalid entity preview JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const entityType = form.getValues().entityType;
      const parentId = form.getValues().parentId;

      const result = await uploadFunction(
        convertStatus.previewFilePath,
        entityType,
        parentId || undefined,
      );

      setUploadStatus({
        type: "success",
        message: result.message,
        count: result.count,
      });
    } catch (error) {
      setUploadStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload to database",
      });
    } finally {
      setIsUploading(false);
    }
  }

  const contextValue: ScraperContextType = {
    currentStep,
    isLoading,
    isUploading,
    isSavingJson,
    isConvertingToEntity,
    status,
    uploadStatus,
    saveJsonStatus,
    convertStatus,
    newSelector,
    editedJsonContent,
    entityPreviewContent,
    form,
    setNewSelector,
    setEditedJsonContent,
    setEntityPreviewContent,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    addSelector,
    removeSelector,
    onScrape,
    onSaveEditedJson,
    onConvertToEntityFormat,
    onUploadEntityPreviewToDatabase,
    scraperFunction,
    saveJsonFunction,
    convertFunction,
    uploadFunction,
    additionalFields,
    onSuccess,
    onError,
    title,
    description,
  };

  return (
    <ScraperContext.Provider value={contextValue}>
      {children}
    </ScraperContext.Provider>
  );
};

// Hook to use scraper context
export const useScraperContext = () => useContext(ScraperContext);

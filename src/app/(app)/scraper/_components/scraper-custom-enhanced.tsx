"use client";

import React, { useState, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";
import {
  scrapeCustomUrl,
  saveEditedJsonContent,
  convertToEntityFormat,
  uploadToEntityDatabase,
} from "../_actions/scraper-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  selectors: z
    .array(z.string().min(1, "Selector cannot be empty"))
    .min(1, "At least one selector is required"),
  outputPath: z.string().min(1, "Output path is required"),
  refetch: z.boolean().default(false),
  entityType: z.string().default("verse"),
  parentId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ScraperCustom() {
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
  const [activeTab, setActiveTab] = useState("json");
  const [editedJsonContent, setEditedJsonContent] = useState("");
  const [entityPreviewContent, setEntityPreviewContent] = useState("");

  // Function to generate safe file name from URL
  const getSafePathFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pageName =
        urlObj.hostname + urlObj.pathname.replace(/[^a-z0-9]/gi, "_");
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.]/g, "")
        .slice(0, 14); // yyyyMMddHHmmss
      const folderName = `${pageName}_${timestamp}`;
      return `./data/custom/${folderName}/extracted.json`;
    } catch (error) {
      // If URL is invalid, return default path
      return "./data/custom/output.json";
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      url: "",
      selectors: [".content", "h1", "p"],
      outputPath: "./data/custom/output.json",
      refetch: false,
      entityType: "verse",
      parentId: "",
    },
  });

  // Watch for URL changes and update the output path
  const watchedUrl = form.watch("url");

  React.useEffect(() => {
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
      currentSelectors.filter((_, i) => i !== index),
    );
  };

  async function onScrape(values: FormValues) {
    setIsLoading(true);
    setStatus(null);
    setUploadStatus(null);
    setSaveJsonStatus(null);
    setConvertStatus(null);

    try {
      const result = await scrapeCustomUrl(
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
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to scrape URL",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSaveEditedJson() {
    if (!status?.jsonFilePath || !editedJsonContent) return;

    setIsSavingJson(true);
    setSaveJsonStatus(null);

    try {
      // Parse the edited JSON to validate it
      const parsedJson = JSON.parse(editedJsonContent);

      const result = await saveEditedJsonContent(
        status.jsonFilePath,
        parsedJson,
      );

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
    if (!status?.jsonFilePath) return;

    setIsConvertingToEntity(true);
    setConvertStatus(null);

    try {
      const entityType = form.getValues().entityType;
      const parentId = form.getValues().parentId;

      const result = await convertToEntityFormat(
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

      // Switch to the entity preview tab
      setActiveTab("entityPreview");

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
    if (!convertStatus?.previewFilePath) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      // First, ensure we save any edits to the entity preview
      try {
        const parsedContent = JSON.parse(entityPreviewContent);
        await saveEditedJsonContent(
          convertStatus.previewFilePath,
          parsedContent,
        );
      } catch (error) {
        throw new Error(
          `Invalid entity preview JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const entityType = form.getValues().entityType;
      const parentId = form.getValues().parentId;

      const result = await uploadToEntityDatabase(
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

  return (
    <div className="space-y-6">
      <div className="prose mb-4">
        <h3>Custom Web Scraper</h3>
        <p className="text-muted-foreground">
          Extract content from any website using CSS selectors, edit the JSON,
          and convert to database entities
        </p>
      </div>

      <div className="border rounded-md p-4">
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/page-to-scrape"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the full URL of the webpage you want to scrape
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectors"
              render={() => (
                <FormItem>
                  <FormLabel>CSS Selectors</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder=".my-class, #my-id, div > p"
                        value={newSelector}
                        onChange={(e) => setNewSelector(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSelector();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={addSelector}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.watch("selectors").map((selector, index) => (
                        <Badge
                          key={`${selector}-${index}`}
                          variant="secondary"
                          className="flex items-center gap-1 py-1 px-3"
                        >
                          {selector}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => removeSelector(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <FormDescription>
                    Add CSS selectors to target specific elements on the page
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="outputPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output Path</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="./data/custom/output.json"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Specify where to save the scraped data (relative to
                      project root)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refetch"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Refetch page</FormLabel>
                      <FormDescription>
                        Refetch the page even if it exists locally
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-2">
                Entity Database Upload Options
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type</FormLabel>
                      <FormControl>
                        <Input placeholder="verse" {...field} />
                      </FormControl>
                      <FormDescription>
                        Specify the entity type for database upload
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Entity ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Parent entity ID" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional parent entity ID for hierarchical structure
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </Form>
      </div>

      <div className="flex gap-3">
        <Button
          variant="default"
          onClick={form.handleSubmit(onScrape as any)}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Scraping...
            </>
          ) : (
            <>
              <span className="i-lucide-search h-4 w-4" />
              Scrape Content
            </>
          )}
        </Button>
      </div>

      {status && (
        <Alert variant={status.type === "success" ? "default" : "destructive"}>
          {status.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {status.type === "success" ? "Success" : "Error"}
          </AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {uploadStatus && (
        <Alert
          variant={uploadStatus.type === "success" ? "default" : "destructive"}
        >
          {uploadStatus.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {uploadStatus.type === "success"
              ? "Upload Success"
              : "Upload Error"}
          </AlertTitle>
          <AlertDescription>{uploadStatus.message}</AlertDescription>
        </Alert>
      )}

      {saveJsonStatus && (
        <Alert
          variant={
            saveJsonStatus.type === "success" ? "default" : "destructive"
          }
        >
          {saveJsonStatus.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {saveJsonStatus.type === "success" ? "Save Success" : "Save Error"}
          </AlertTitle>
          <AlertDescription>{saveJsonStatus.message}</AlertDescription>
        </Alert>
      )}

      {convertStatus && (
        <Alert
          variant={convertStatus.type === "success" ? "default" : "destructive"}
        >
          {convertStatus.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {convertStatus.type === "success"
              ? "Conversion Success"
              : "Conversion Error"}
          </AlertTitle>
          <AlertDescription>{convertStatus.message}</AlertDescription>
        </Alert>
      )}

      {status?.type === "success" && status.data && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-md">Scraped Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                // Clear statuses when switching tabs for a cleaner UI
                setSaveJsonStatus(null);
                setUploadStatus(null);
              }}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="html">HTML Source</TabsTrigger>
                <TabsTrigger value="json">Extracted Data</TabsTrigger>
                <TabsTrigger value="entityPreview">Entity Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="html" className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>HTML file saved at: {status.htmlFilePath}</p>
                </div>
                <div className="bg-muted p-3 rounded-md overflow-auto max-h-80">
                  <pre className="text-xs whitespace-pre-wrap">
                    {/* HTML content would be very large, so we just show a message */}
                    HTML content saved to file. View in the file system for full
                    content.
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="json" className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  <p>JSON file saved at: {status.jsonFilePath}</p>
                  <p className="mt-1 text-xs">
                    <Edit className="h-3 w-3 inline mr-1" />
                    You can edit the JSON content below and save changes
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-md overflow-auto max-h-80">
                  <Textarea
                    value={editedJsonContent}
                    onChange={(e) => setEditedJsonContent(e.target.value)}
                    className="text-xs font-mono min-h-[200px]"
                    spellCheck={false}
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <Button
                    onClick={onSaveEditedJson}
                    disabled={isSavingJson}
                    variant="outline"
                    className="gap-2"
                  >
                    {isSavingJson ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Edited JSON
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={onConvertToEntityFormat}
                    disabled={isConvertingToEntity}
                    variant="default"
                    className="gap-2"
                  >
                    {isConvertingToEntity ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Convert to Entity Format
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Convert JSON to database entity format for
                                upload
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="entityPreview" className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  <p>
                    Entity preview file saved at:{" "}
                    {convertStatus?.previewFilePath}
                  </p>
                  <p className="mt-1 text-xs">
                    <Edit className="h-3 w-3 inline mr-1" />
                    You can edit the entity preview below before uploading to
                    database
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-md overflow-auto max-h-80">
                  <Textarea
                    value={entityPreviewContent}
                    onChange={(e) => setEntityPreviewContent(e.target.value)}
                    className="text-xs font-mono min-h-[200px]"
                    spellCheck={false}
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <Button
                    onClick={async () => {
                      if (!convertStatus?.previewFilePath) return;
                      setIsSavingJson(true);

                      try {
                        // Parse the edited content to validate it
                        const parsedContent = JSON.parse(entityPreviewContent);

                        // Save the edited entity preview content
                        const result = await saveEditedJsonContent(
                          convertStatus.previewFilePath,
                          parsedContent,
                        );

                        // Update the convertStatus with the edited content
                        setConvertStatus({
                          ...convertStatus,
                          entities: parsedContent,
                        });

                        setSaveJsonStatus({
                          type: "success",
                          message: "Successfully saved edited entity preview",
                        });
                      } catch (error) {
                        setSaveJsonStatus({
                          type: "error",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Failed to save edited entity preview. Make sure it's valid JSON.",
                        });
                      } finally {
                        setIsSavingJson(false);
                      }
                    }}
                    disabled={isSavingJson}
                    variant="outline"
                    className="gap-2"
                  >
                    {isSavingJson ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Edited Entity Preview
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={onUploadEntityPreviewToDatabase}
                    disabled={isUploading}
                    variant="default"
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Upload Entity Preview
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Upload entities to the database using selected
                                entity type and parent ID
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Files saved in: {status.folderPath}
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

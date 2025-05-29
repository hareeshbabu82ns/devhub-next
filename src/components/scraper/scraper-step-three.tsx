"use client";

import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Save, Upload } from "lucide-react";
import { JsonEditor } from "./json-editor";
import { StatusAlert } from "./scraper-ui-components";
import { LoadingButtonContent } from "./scraper-ui-components";
import { useScraperContext } from "./scraper-context";

export const ScraperStepThree: React.FC = () => {
  const {
    form,
    convertStatus,
    entityPreviewContent,
    setEntityPreviewContent,
    isSavingJson,
    isUploading,
    saveJsonStatus,
    uploadStatus,
    goToPreviousStep,
    onUploadEntityPreviewToDatabase,
    saveJsonFunction,
    uploadFunction,
  } = useScraperContext();

  if (convertStatus?.type !== "success") return null;

  const handleSaveEntityPreview = async () => {
    if (!convertStatus?.previewFilePath || !saveJsonFunction) return;
    try {
      // Parse the edited content to validate it
      const parsedContent = JSON.parse(entityPreviewContent);

      // Save the edited entity preview content
      await saveJsonFunction(convertStatus.previewFilePath, parsedContent);
    } catch (error) {
      console.error("Failed to save entity preview:", error);
    }
  };

  return (
    <>
      <Form {...form}>
        <Card className="flex-1 overflow-auto">
          <CardHeader>
            <CardTitle className="text-md">Entity Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">
              <p>
                Entity preview file saved at: {convertStatus.previewFilePath}
              </p>
              <p className="mt-1 text-xs">
                <Edit className="h-3 w-3 inline mr-1" />
                You can edit the entity preview below before uploading to
                database
              </p>
            </div>
            <div className="rounded-md flex-1">
              <JsonEditor
                content={entityPreviewContent}
                onChange={setEntityPreviewContent}
                className="h-full"
              />
            </div>
          </CardContent>
        </Card>
      </Form>

      <div className="flex gap-3 mb-4">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          className="gap-2"
          type="button"
        >
          <span className="i-lucide-arrow-left h-4 w-4" />
          Back: Process JSON
        </Button>

        <Button
          onClick={async () => {
            if (!convertStatus?.previewFilePath || !saveJsonFunction) return;

            try {
              // Parse the edited content to validate it
              const parsedContent = JSON.parse(entityPreviewContent);

              // Save the edited entity preview content
              const result = await saveJsonFunction(
                convertStatus.previewFilePath,
                parsedContent,
              );
            } catch (error) {
              console.error("Failed to save entity preview:", error);
            }
          }}
          disabled={isSavingJson || !saveJsonFunction}
          variant="outline"
          className="gap-2"
          type="button"
        >
          <LoadingButtonContent
            isLoading={isSavingJson}
            loadingText="Saving..."
            icon={<Save className="h-4 w-4" />}
            text="Save Edited Entity Preview"
          />
        </Button>

        <Button
          onClick={onUploadEntityPreviewToDatabase}
          disabled={isUploading || !uploadFunction}
          variant="default"
          className="gap-2"
          type="button"
        >
          <LoadingButtonContent
            isLoading={isUploading}
            loadingText="Uploading..."
            icon={<Upload className="h-4 w-4" />}
            text="Upload to Database"
          />
        </Button>
      </div>

      {saveJsonStatus && (
        <StatusAlert
          type={saveJsonStatus.type}
          title={
            saveJsonStatus.type === "success" ? "Save Success" : "Save Error"
          }
          message={saveJsonStatus.message}
          className="mt-4"
        />
      )}

      {uploadStatus && (
        <StatusAlert
          type={uploadStatus.type}
          title={
            uploadStatus.type === "success" ? "Upload Success" : "Upload Error"
          }
          message={uploadStatus.message}
          className="mt-4"
        />
      )}

      {uploadStatus?.count && uploadStatus.type === "success" && (
        <div className="mt-2 text-sm">
          Successfully uploaded {uploadStatus.count} entities to the database.
        </div>
      )}
    </>
  );
};

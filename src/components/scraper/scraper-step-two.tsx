"use client";

import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Edit, Save, Download } from "lucide-react";
import { JsonEditor } from "./json-editor";
import { EntityTypeConfig } from "./entity-type-config";
import { StatusAlert } from "./scraper-ui-components";
import { LoadingButtonContent } from "./scraper-ui-components";
import { useScraperContext } from "./scraper-context";

export const ScraperStepTwo: React.FC = () => {
  const {
    form,
    status,
    editedJsonContent,
    setEditedJsonContent,
    saveJsonStatus,
    convertStatus,
    isSavingJson,
    isConvertingToEntity,
    onSaveEditedJson,
    onConvertToEntityFormat,
    goToPreviousStep,
    saveJsonFunction,
    convertFunction,
  } = useScraperContext();

  if (status?.type !== "success") return null;

  return (
    <>
      <Card className="flex-1 overflow-auto">
        <CardHeader>
          <CardTitle className="text-md">Extracted JSON Data</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="text-sm text-muted-foreground mb-2">
            <p>JSON file saved at: {status.jsonFilePath}</p>
            <p className="mt-1 text-xs">
              <Edit className="h-3 w-3 inline mr-1" />
              You can edit the JSON content below and save changes
            </p>
          </div>
          <div className="rounded-md flex-1 overflow-auto">
            <JsonEditor
              content={editedJsonContent}
              onChange={setEditedJsonContent}
              className="h-full"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-4">
          <Form {...form}>
            <EntityTypeConfig />
          </Form>
        </CardFooter>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          className="gap-2"
          type="button"
        >
          <span className="i-lucide-arrow-left h-4 w-4" />
          Back: Scrape HTML
        </Button>

        <Button
          onClick={onSaveEditedJson}
          disabled={isSavingJson || !saveJsonFunction}
          variant="outline"
          className="gap-2"
          type="button"
        >
          <LoadingButtonContent
            isLoading={isSavingJson}
            loadingText="Saving..."
            icon={<Save className="h-4 w-4" />}
            text="Save Edited JSON"
          />
        </Button>

        <Button
          onClick={onConvertToEntityFormat}
          disabled={isConvertingToEntity || !convertFunction}
          variant="default"
          className="gap-2"
          type="button"
        >
          <LoadingButtonContent
            isLoading={isConvertingToEntity}
            loadingText="Converting..."
            icon={<Download className="h-4 w-4" />}
            text="Convert to Entity Format"
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
          className="mb-4 mt-4"
        />
      )}

      {convertStatus && (
        <StatusAlert
          type={convertStatus.type}
          title={
            convertStatus.type === "success"
              ? "Conversion Success"
              : "Conversion Error"
          }
          message={convertStatus.message}
          className="mb-4"
        />
      )}
    </>
  );
};

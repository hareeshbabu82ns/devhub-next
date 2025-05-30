"use client";

import React from "react";
import { GenericScraper } from "@/components/scraper/generic-scraper";
import {
  saveEditedJsonContent,
  uploadToEntityDatabase,
} from "@/app/(app)/scraper/_actions/scraper-actions";
import { z } from "zod";
import {
  convertSthotranidhiToEntityFormat,
  scrapeSthotranidhi,
} from "../_actions/sthotranidhi-actions";

const customFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  selectors: z
    .array(z.string().min(1, "Selector cannot be empty"))
    .min(1, "At least one selector is required"),
  refetch: z.boolean().default(false),
  entityType: z.string().default("STHOTRAM"),
  parentId: z.string().min(1, "Parent ID cannot be empty"),
});

// Enhanced default values
const customDefaultValues = {
  url: "https://stotranidhi.com/kanakadhara-stotram-in-telugu/",
  selectors: [".entry-title", ".entry-content p"],
  refetch: false,
  parentId: "67097f78685941d233751dcb",
  entityType: "STHOTRAM",
};

export function ScraperSthotranidhi() {
  return (
    <GenericScraper
      formSchema={customFormSchema}
      defaultValues={customDefaultValues}
      title="Sthotra Nidhi Scraper"
      scraperFunction={(url, selectors, refetch) => {
        return scrapeSthotranidhi(url, selectors, refetch);
      }}
      saveJsonFunction={saveEditedJsonContent}
      convertFunction={convertSthotranidhiToEntityFormat}
      uploadFunction={uploadToEntityDatabase}
      onSuccess={(result) => {
        console.log("Scraping completed successfully", result);
      }}
      onError={(error) => {
        console.error("Scraping failed", error);
      }}
    />
  );
}

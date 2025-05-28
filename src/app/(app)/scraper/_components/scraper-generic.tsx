"use client";

import React from "react";
import { GenericScraper } from "@/components/scraper/generic-scraper";
import {
  scrapeCustomUrl,
  saveEditedJsonContent,
  convertToEntityFormat,
  uploadToEntityDatabase,
} from "../_actions/scraper-actions";

export function ScraperGeneric() {
  return (
    <GenericScraper
      title="Generic Web Scraper"
      description="Extract content from any website using CSS selectors, edit the JSON, and convert to database entities"
      scraperFunction={scrapeCustomUrl}
      saveJsonFunction={saveEditedJsonContent}
      convertFunction={convertToEntityFormat}
      uploadFunction={uploadToEntityDatabase}
    />
  );
}

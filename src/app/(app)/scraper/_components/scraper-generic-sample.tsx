"use client";

import React from "react";
import { GenericScraper } from "@/components/scraper/generic-scraper";
import {
  scrapeCustomUrl,
  saveEditedJsonContent,
  convertToEntityFormat,
  uploadToEntityDatabase,
} from "@/app/(app)/scraper/_actions/scraper-actions";
import { z } from "zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Custom form schema with additional fields
const customFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  selectors: z
    .array(z.string().min(1, "Selector cannot be empty"))
    .min(1, "At least one selector is required"),
  refetch: z.boolean().default(false),
  entityType: z.string().default("STHOTRAM"),
  parentId: z.string().optional(),
  language: z.string().default("en"),
  extractImages: z.boolean().default(false),
});

// Enhanced default values
const customDefaultValues = {
  url: "",
  selectors: [".content", "h1", "p", ".article-body"],
  refetch: false,
  entityType: "STHOTRAM",
  parentId: "",
  language: "en",
  extractImages: false,
};

// Example of a custom scraper function that extends the default one
async function customScraperWithImages(
  url: string,
  selectors: string[],
  refetch: boolean = false,
) {
  // This is just a demonstration - in a real implementation,
  // you would actually modify the scraping logic to handle images
  console.log("Custom scraper with image extraction enabled");

  // Call the original scraper function
  return await scrapeCustomUrl(url, selectors, refetch);
}

export function GenericSampleScraper() {
  // Example of custom additional fields
  const customFields = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <FormField
        name="language"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Content Language</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="sa">Sanskrit</SelectItem>
                <SelectItem value="te">Telugu</SelectItem>
                <SelectItem value="ta">Tamil</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Specify the primary language of the content
            </FormDescription>
          </FormItem>
        )}
      />
      <FormField
        name="extractImages"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="form-checkbox h-4 w-4"
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Extract Images</FormLabel>
              <FormDescription>
                Also extract and save images from the page
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );

  // Function to determine which scraper to use based on form values
  const scraperSelector = (formValues: any) => {
    if (formValues.extractImages) {
      return customScraperWithImages;
    }
    return scrapeCustomUrl;
  };

  return (
    <GenericScraper
      formSchema={customFormSchema}
      defaultValues={customDefaultValues}
      title="Enhanced Web Scraper"
      description="Scrape content with advanced options including image extraction and language selection"
      // Use a function that determines which scraper to use based on form values
      scraperFunction={(url, selectors, refetch) => {
        const formValues = {
          url,
          selectors,
          refetch,
          extractImages: customDefaultValues.extractImages,
        };
        return scraperSelector(formValues)(url, selectors, refetch);
      }}
      saveJsonFunction={saveEditedJsonContent}
      convertFunction={convertToEntityFormat}
      uploadFunction={uploadToEntityDatabase}
      additionalFields={customFields}
      onSuccess={(result) => {
        console.log("Scraping completed successfully", result);
      }}
      onError={(error) => {
        console.error("Scraping failed", error);
      }}
    />
  );
}

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
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const customFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  selectors: z
    .array(z.string().min(1, "Selector cannot be empty"))
    .min(1, "At least one selector is required"),
  refetch: z.boolean().default(false),
  entityType: z.string().default("STHOTRAM"),
  parentId: z.string().min(1, "Parent ID cannot be empty"),
  linesToSkip: z.string().min(1, "Line to skip cannot be empty"),
});

// Enhanced default values
const customDefaultValues = {
  url: "https://stotranidhi.com/kanakadhara-stotram-in-telugu/",
  selectors: [".entry-title", ".entry-content p"],
  refetch: false,
  parentId: "67097f78685941d233751dcb",
  entityType: "STHOTRAM",
  linesToSkip: [
    "^Read in తెలుగు / ಕನ್ನಡ / தமிழ் / देवनागरी / English \\(IAST\\)$",
    "^\\(నిత్య పారాయణ గ్రంథము\\)$",
    "^\\[గమనిక:.*\\]$",
    "^గమనిక:.*పుస్తకములో కూడా ఉన్నది.$",
    ".*కూడా ఉన్నది చూడండి.\\]$",
    "^స్తోత్రనిధి →.*",
    "^stōtranidhi →.*",
    "^स्तोत्रनिधि →.*",
    "^Notes & References:.*",
    "^Click here to buy.*",
    "^మరిన్ని.*చూడండి.$",
    "^మా తదుపరి ప్రచురణ  :.*",
    "^పైరసీ ప్రకటన :.*",
    "^Chant other stotras in .*",
    "^Did you see any mistake/variation.*",
    "^See more .* for chanting.$",
    "^See more .* for chanting.$",
    "^इतर .* स्तोत्राणि पश्यतु ।$",
  ].join("\n"),
};

export function ScraperSthotranidhi() {
  const [linesToSkip, setLinesToSkip] = React.useState(
    customDefaultValues.linesToSkip.split("\n").map((line) => line.trim()),
  );
  const customFields = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <FormField
        name="linesToSkip"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Content Lines to Skip (Regex)</FormLabel>
            <Textarea
              placeholder="Enter content lines to skip"
              value={field.value}
              // onChange={field.onChange}
              // value={linesToSkip.join("\n")}
              onChange={(e) => {
                setLinesToSkip(
                  e.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                );
                field.onChange(e);
              }}
            />
          </FormItem>
        )}
      />
    </div>
  );
  return (
    <GenericScraper
      formSchema={customFormSchema}
      defaultValues={customDefaultValues}
      title="Sthotra Nidhi Scraper"
      scraperFunction={(url, selectors, refetch) => {
        return scrapeSthotranidhi(url, selectors, refetch, linesToSkip);
      }}
      saveJsonFunction={saveEditedJsonContent}
      convertFunction={convertSthotranidhiToEntityFormat}
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

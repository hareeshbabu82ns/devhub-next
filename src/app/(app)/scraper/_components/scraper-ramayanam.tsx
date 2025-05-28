"use client";

import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  scrapeRamayanam,
  processRamayanamToJSON,
  createRamayanamEntities,
} from "../_actions/scraper-actions";

const formSchema = z.object({
  baseUrl: z.string().url("Please enter a valid URL"),
  startKandam: z.number().min(1).max(7).optional(),
  endKandam: z.number().min(0).max(7).optional(),
  entityParentId: z.string().min(1, "Parent Entity ID is required"),
});

export function ScraperRamayanam() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseUrl: "https://sacred-texts.com/hin/rys/",
      startKandam: 1,
      endKandam: 0, // 0 means all
      entityParentId: "",
    },
  });

  async function onScrapeHtml(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setStatus(null);

    try {
      const result = await scrapeRamayanam(
        values.baseUrl,
        values.startKandam,
        values.endKandam,
      );
      setStatus({
        type: "success",
        message: `Successfully scraped HTML for ${result.scrapedCount} pages.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to scrape HTML",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onProcessJson() {
    setIsLoading(true);
    setStatus(null);

    try {
      const result = await processRamayanamToJSON();
      setStatus({
        type: "success",
        message: `Successfully processed ${result.processedCount} pages to JSON.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to process JSON",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onCreateEntities() {
    setIsLoading(true);
    setStatus(null);

    try {
      const parentId = form.getValues().entityParentId;
      if (!parentId) {
        throw new Error("Parent Entity ID is required");
      }

      const result = await createRamayanamEntities(parentId);
      setStatus({
        type: "success",
        message: `Successfully created ${result.createdCount} entities.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create entities",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="prose mb-4">
        <h3>Ramayanam Scraper</h3>
        <p className="text-muted-foreground">
          Scrape Ramayanam content from web sources and create entities
        </p>
      </div>

      <div className="border rounded-md p-4">
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="baseUrl"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/ramayanam"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startKandam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Kandam (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endKandam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Kandam (0 means all)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="7"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="entityParentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Entity ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Entity ID to attach scraped content"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={form.handleSubmit(onScrapeHtml)}
          disabled={isLoading}
        >
          1. Scrape HTML
        </Button>
        <Button variant="outline" onClick={onProcessJson} disabled={isLoading}>
          2. Process to JSON
        </Button>
        <Button
          variant="default"
          onClick={onCreateEntities}
          disabled={isLoading}
        >
          3. Create Entities
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
    </div>
  );
}

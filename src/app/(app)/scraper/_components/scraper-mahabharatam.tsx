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
  scrapeMahabharatamMeanings,
  processMahabharatamToJSON,
  processMahabharatamSlokas,
  createMahabharatamEntities,
} from "../_actions/scraper-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  baseUrl: z.string().url("Please enter a valid URL"),
  startParva: z.string().optional(),
  endParva: z.string().optional(),
  entityParentId: z.string().optional(),
});

export function ScraperMahabharatam() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("meanings");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseUrl: "https://sacred-texts.com/hin/mbs",
      startParva: "",
      endParva: "",
      entityParentId: "",
    },
  });

  async function onScrapeMeanings(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setStatus(null);

    try {
      const result = await scrapeMahabharatamMeanings(
        values.baseUrl,
        values.startParva,
        values.endParva,
      );
      setStatus({
        type: "success",
        message: `Successfully scraped meanings for ${result.scrapedCount} pages.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to scrape meanings",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onProcessMeaningsToJson() {
    setIsLoading(true);
    setStatus(null);

    try {
      const result = await processMahabharatamToJSON();
      setStatus({
        type: "success",
        message: `Successfully processed ${result.processedCount} meaning pages to JSON.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to process meanings to JSON",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onProcessSlokas() {
    setIsLoading(true);
    setStatus(null);

    try {
      const result = await processMahabharatamSlokas();
      setStatus({
        type: "success",
        message: `Successfully processed ${result.processedCount} sloka files.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to process slokas",
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

      const result = await createMahabharatamEntities(parentId);
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
        <h3>Mahabharatam Scraper</h3>
        <p className="text-muted-foreground">
          Scrape Mahabharatam content from web sources and create entities
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="meanings">Meanings</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
        </TabsList>

        <TabsContent value="meanings" className="space-y-4 pt-4">
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
                          placeholder="https://example.com/mahabharatam"
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
                    name="startParva"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Parva (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endParva"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Parva (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Form>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={form.handleSubmit(onScrapeMeanings)}
              disabled={isLoading}
            >
              1. Scrape Meanings HTML
            </Button>
            <Button
              variant="outline"
              onClick={onProcessMeaningsToJson}
              disabled={isLoading}
            >
              2. Process Meanings to JSON
            </Button>
            <Button
              variant="outline"
              onClick={onProcessSlokas}
              disabled={isLoading}
            >
              3. Process Slokas
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="entities" className="space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
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

                <Button
                  variant="default"
                  onClick={onCreateEntities}
                  disabled={isLoading}
                  className="mt-4"
                >
                  Create Entities
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

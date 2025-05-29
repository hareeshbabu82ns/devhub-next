"use client";

import React from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SelectorList } from "./selector-list";
import { StatusAlert } from "./scraper-ui-components";
import { LoadingButtonContent } from "./scraper-ui-components";
import { useScraperContext } from "./scraper-context";

export const ScraperStepOne: React.FC = () => {
  const { form, isLoading, status, onScrape, goToNextStep, scraperFunction } =
    useScraperContext();

  return (
    <>
      <div className="border rounded-md p-4 flex flex-col gap-4 @container">
        <Form {...form}>
          <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
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

          <SelectorList />

          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the parent ID" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the ID of the parent entity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the entity type" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the type of the entity to scrape
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </div>

      <div className="flex gap-3 mb-4">
        <Button
          variant="default"
          onClick={form.handleSubmit(onScrape)}
          disabled={isLoading || !scraperFunction}
          className="gap-2"
        >
          <LoadingButtonContent
            isLoading={isLoading}
            loadingText="Scraping..."
            icon={<span className="i-lucide-search h-4 w-4" />}
            text="Scrape Content"
          />
        </Button>
        {status?.type === "success" && (
          <Button
            variant="outline"
            onClick={goToNextStep}
            className="gap-2"
            type="button"
          >
            Next: Process JSON
            <span className="i-lucide-arrow-right h-4 w-4" />
          </Button>
        )}
      </div>

      {status && <StatusAlert type={status.type} message={status.message} />}

      {status?.type === "success" && (
        <div className="text-sm text-muted-foreground mt-4">
          <p>HTML file saved at: {status.htmlFilePath}</p>
          <p>Files saved in: {status.folderPath}</p>
        </div>
      )}
    </>
  );
};

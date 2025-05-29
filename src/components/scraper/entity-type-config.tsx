"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useScraperContext } from "./scraper-context";

export const EntityTypeConfig: React.FC = () => {
  const { form } = useScraperContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
  );
};

"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useScraperContext } from "./scraper-context";

export const SelectorList: React.FC = () => {
  const { form, newSelector, setNewSelector, addSelector, removeSelector } =
    useScraperContext();

  return (
    <FormField
      control={form.control}
      name="selectors"
      render={() => (
        <FormItem>
          <FormLabel>CSS Selectors</FormLabel>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder=".my-class, #my-id, div > p"
                value={newSelector}
                onChange={(e) => setNewSelector(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSelector();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                onClick={addSelector}
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {form
                .watch("selectors")
                .map((selector: string, index: number) => (
                  <Badge
                    key={`${selector}-${index}`}
                    variant="secondary"
                    className="flex items-center gap-1 py-1 px-3"
                  >
                    {selector}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeSelector(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
            </div>
          </div>
          <FormDescription>
            Add CSS selectors to target specific elements on the page
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

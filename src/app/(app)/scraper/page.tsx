"use client";

import { ScraperLayout } from "./_components/scraper-layout";
import { Separator } from "@/components/ui/separator";

export default function ScraperPage() {
  return (
    <div className="flex flex-col w-full space-y-4">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Scraper</h1>
        <p className="text-muted-foreground">
          Extract content from various sources and create entities in the
          database.
        </p>
      </div>
      <Separator />
      <ScraperLayout />
    </div>
  );
}

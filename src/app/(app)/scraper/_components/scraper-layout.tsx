"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Clock } from "lucide-react";
import { ScraperRamayanam } from "./scraper-ramayanam";
import { ScraperMahabharatam } from "./scraper-mahabharatam";
import { ScraperGeneric } from "./scraper-generic";
import { GenericSampleScraper } from "./scraper-generic-sample";

// Define the navigation items
const navItems = [
  {
    id: "ramayanam",
    label: "Ramayanam",
    group: "Sacred Texts",
    status: "available",
  },
  {
    id: "mahabharatam",
    label: "Mahabharatam",
    group: "Sacred Texts",
    status: "available",
  },
  {
    id: "bhagavatam",
    label: "Bhagavatam",
    group: "Sacred Texts",
    status: "coming-soon",
  },
  { id: "vedas", label: "Vedas", group: "Sacred Texts", status: "coming-soon" },
  {
    id: "upanishads",
    label: "Upanishads",
    group: "Sacred Texts",
    status: "coming-soon",
  },
  {
    id: "generic",
    label: "Generic Scraper",
    group: "Tools",
    status: "available",
  },
  {
    id: "generic-sample",
    label: "Generic Scraper (Sample)",
    group: "Tools",
    status: "available",
  },
  {
    id: "batch",
    label: "Batch Processing",
    group: "Tools",
    status: "coming-soon",
  },
  {
    id: "maintenance",
    label: "Data Maintenance",
    group: "Tools",
    status: "coming-soon",
  },
  // You can add more scraper types here in the future
];

export function ScraperLayout() {
  const [activeSection, setActiveSection] = useState("ramayanam");

  // Render the active content based on the selected section
  const renderContent = () => {
    switch (activeSection) {
      case "ramayanam":
        return <ScraperRamayanam />;
      case "mahabharatam":
        return <ScraperMahabharatam />;
      case "generic":
        return <ScraperGeneric />;
      case "generic-sample":
        return <GenericSampleScraper />;
      case "bhagavatam":
      case "vedas":
      case "upanishads":
      case "batch":
      case "maintenance":
        return (
          <div className="p-6 text-center">
            <div className="rounded-md border border-dashed p-8 mt-12">
              <h3 className="text-xl font-medium mb-2">Coming Soon</h3>
              <p className="text-muted-foreground">
                This feature is currently under development and will be
                available soon.
              </p>
            </div>
          </div>
        );
      default:
        return <ScraperRamayanam />;
    }
  };

  // Function to render the status indicator
  const renderStatusIndicator = (status: string) => {
    if (status === "available") {
      return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    } else if (status === "coming-soon") {
      return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    }
    return null;
  };

  return (
    <div className="flex w-full h-[calc(100vh-10rem)] overflow-hidden">
      {/* Left side navigation menu */}
      <div className="w-64 border-r shrink-0">
        <ScrollArea className="h-[calc(100%-3.5rem)]">
          <div className="py-2">
            {/* Group navigation items by their group */}
            {Object.entries(
              navItems.reduce(
                (groups, item) => {
                  const group = item.group || "Other";
                  return {
                    ...groups,
                    [group]: [...(groups[group] || []), item],
                  };
                },
                {} as Record<string, typeof navItems>,
              ),
            ).map(([groupName, items]) => (
              <div key={groupName} className="mb-4">
                <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {groupName}
                </div>
                {items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-between px-4 py-2 text-left rounded-none text-sm",
                      activeSection === item.id && "bg-muted font-medium",
                      item.status === "coming-soon" && "opacity-60",
                    )}
                    onClick={() =>
                      item.status === "available" && setActiveSection(item.id)
                    }
                    disabled={item.status !== "available"}
                  >
                    <span>{item.label}</span>
                    <span className="flex items-center">
                      {renderStatusIndicator(item.status)}
                    </span>
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right side content area */}
      <div className="flex-1 px-4 py-2">{renderContent()}</div>
    </div>
  );
}

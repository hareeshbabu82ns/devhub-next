/**
 * DictionaryExportModal - Export Dialog Component
 * 
 * Phase 10: User Story 6 (US6) - Export and Download Functionality
 * Tasks: T137-T145
 * 
 * Purpose: Allow users to export search results in various formats
 * Features:
 * - Format selection (CSV/JSON/PDF) - T137
 * - Field selection UI - T138
 * - Progress bar for large exports - T141
 * - Warning dialog for large PDF exports - T144
 * - ARIA labels - T145
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileDown, FileText, FileJson, FileType, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ExportFieldSelection,
  generateExportFilename,
  exportToCSV,
  exportToJSON,
  exportToPDF,
  downloadFile,
} from "@/lib/dictionary/export-utils";
import type { DictionaryItem } from "../types";
import { getAriaAnnouncer } from "@/lib/accessibility/focus-management";

interface DictionaryExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: Partial<DictionaryItem>[];
  totalResults: number;
  filters?: Record<string, any>;
  isLoadingResults?: boolean;
}

/**
 * T137-T145: Export modal with format selection and field selection
 */
export function DictionaryExportModal({
  open,
  onOpenChange,
  results,
  totalResults,
  filters,
  isLoadingResults = false,
}: DictionaryExportModalProps) {
  const [format, setFormat] = useState<"csv" | "json" | "pdf">("csv");
  const [showPDFWarning, setShowPDFWarning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // T138: Field selection state
  const [fields, setFields] = useState<ExportFieldSelection>({
    word: true,
    phonetic: true,
    origin: true,
    description: true,
    attributes: false,
    sourceData: false,
  });

  // Toggle individual field
  const toggleField = (field: keyof ExportFieldSelection) => {
    setFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Select all fields
  const selectAllFields = () => {
    setFields({
      word: true,
      phonetic: true,
      origin: true,
      description: true,
      attributes: true,
      sourceData: true,
    });
  };

  // T144: Check if PDF export should show warning (10,000+ entries)
  const shouldShowPDFWarning = format === "pdf" && totalResults >= 10000;

  // Handle format change
  const handleFormatChange = (newFormat: "csv" | "json" | "pdf") => {
    setFormat(newFormat);
    // T144: Show warning for large PDF exports
    if (newFormat === "pdf" && totalResults >= 10000) {
      setShowPDFWarning(true);
    } else {
      setShowPDFWarning(false);
    }
  };

  // T139-T142: Handle export with progress tracking
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // T145: Announce to screen readers
      getAriaAnnouncer().announce(`Starting export of ${results.length} entries as ${format.toUpperCase()}`);

      const filename = generateExportFilename(format, filters);

      // T140: Process in chunks for large datasets
      let blob: Blob;
      
      if (format === "csv") {
        const csvContent = exportToCSV(results, fields);
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        setExportProgress(100);
      } else if (format === "json") {
        const jsonContent = exportToJSON(results, fields);
        blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
        setExportProgress(100);
      } else {
        // PDF export with progress tracking
        setExportProgress(20);
        const pdfBlob = await exportToPDF(results, fields);
        setExportProgress(80);
        blob = pdfBlob;
        setExportProgress(100);
      }

      // Download the file
      downloadFile(blob, filename);

      // T145: Announce completion
      getAriaAnnouncer().announce(`Export completed: ${filename}`);

      // Close modal after short delay
      setTimeout(() => {
        onOpenChange(false);
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    } catch (error) {
      console.error("Export failed:", error);
      getAriaAnnouncer().announce("Export failed. Please try again.");
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        aria-describedby="export-description"
      >
        <DialogHeader>
          <DialogTitle id="export-title">Export Dictionary Results</DialogTitle>
          <DialogDescription id="export-description">
            {isLoadingResults ? (
              "Loading search results for export..."
            ) : (
              <>
                Export {results.length} {results.length === 1 ? "result" : "results"} 
                {totalResults > results.length && ` (of ${totalResults} total)`} to your preferred format.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoadingResults ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">
              Fetching current search results...
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
          {/* T137: Format selection with radio cards */}
          <div className="space-y-3">
            <Label htmlFor="format-group" className="text-base font-medium">
              Export Format
            </Label>
            <RadioGroup
              id="format-group"
              value={format}
              onValueChange={(value) => handleFormatChange(value as "csv" | "json" | "pdf")}
              className="grid grid-cols-3 gap-3"
              aria-label="Select export format" // T145
            >
              {/* CSV Option */}
              <label
                htmlFor="format-csv"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors",
                  "hover:bg-accent/50",
                  format === "csv" && "border-primary bg-accent"
                )}
              >
                <RadioGroupItem
                  id="format-csv"
                  value="csv"
                  className="sr-only"
                />
                <FileText className="h-8 w-8" />
                <span className="text-sm font-medium">CSV</span>
              </label>

              {/* JSON Option */}
              <label
                htmlFor="format-json"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors",
                  "hover:bg-accent/50",
                  format === "json" && "border-primary bg-accent"
                )}
              >
                <RadioGroupItem
                  id="format-json"
                  value="json"
                  className="sr-only"
                />
                <FileJson className="h-8 w-8" />
                <span className="text-sm font-medium">JSON</span>
              </label>

              {/* PDF Option */}
              <label
                htmlFor="format-pdf"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors",
                  "hover:bg-accent/50",
                  format === "pdf" && "border-primary bg-accent"
                )}
              >
                <RadioGroupItem
                  id="format-pdf"
                  value="pdf"
                  className="sr-only"
                />
                <FileType className="h-8 w-8" />
                <span className="text-sm font-medium">PDF</span>
              </label>
            </RadioGroup>
          </div>

          {/* T144: Warning for large PDF exports */}
          {showPDFWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Large PDF Export</AlertTitle>
              <AlertDescription>
                Exporting {totalResults.toLocaleString()}+ entries to PDF may take a long time and result in a very large file.
                Consider using CSV or JSON format instead for better performance.
              </AlertDescription>
            </Alert>
          )}

          {/* T138: Field selection with checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Select Fields to Export
              </Label>
              <Button
                variant="link"
                size="sm"
                onClick={selectAllFields}
                className="h-auto p-0"
              >
                Select All
              </Button>
            </div>
            
            <div className="space-y-2">
              {/* Field checkboxes with min 48px height for mobile */}
              {(Object.keys(fields) as Array<keyof ExportFieldSelection>).map((field) => (
                <div
                  key={field}
                  className="flex items-center space-x-3 rounded-md border p-3 min-h-12"
                >
                  <Checkbox
                    id={`field-${field}`}
                    checked={fields[field]}
                    onCheckedChange={() => toggleField(field)}
                    aria-label={`Include ${field} field in export`} // T145
                  />
                  <Label
                    htmlFor={`field-${field}`}
                    className="flex-1 cursor-pointer capitalize"
                  >
                    {field.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* T141: Progress bar for large exports */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress
                value={exportProgress}
                className="h-2"
                aria-label="Export progress" // T145
                aria-valuenow={exportProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting || isLoadingResults}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || isLoadingResults || Object.values(fields).every((v) => !v)}
            className="gap-2"
            aria-label={`Export as ${format.toUpperCase()}`} // T145
          >
            <FileDown className="h-4 w-4" />
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>

        {/* T145: Screen reader live region for export status */}
        <div className="sr-only" role="status" aria-live="polite">
          {isExporting && `Exporting ${exportProgress}% complete`}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DictionaryExportModal;
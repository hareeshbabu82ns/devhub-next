/**
 * Export Utilities - Dictionary Export Functions
 * 
 * Phase 10: User Story 6 (US6) - Export and Download Functionality
 * Tasks: T132-T136
 * 
 * Purpose: Allow exporting search results to CSV, JSON, PDF
 * Features:
 * - CSV generation - T132
 * - JSON export - T133
 * - PDF export with jsPDF - T134
 * - Filename generation - T135
 * - Filename truncation - T136
 */

import type { DictionaryItem } from "@/app/(app)/dictionary/types";

/**
 * Selected fields for export
 */
export interface ExportFieldSelection {
  word: boolean;
  phonetic: boolean;
  origin: boolean;
  description: boolean;
  attributes: boolean;
  sourceData: boolean;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: "csv" | "json" | "pdf";
  fields: ExportFieldSelection;
  filename?: string;
  filters?: Record<string, any>;
}

/**
 * T135: Generate filename following pattern:
 * dictionary-export-{YYYYMMDD-HHMMSS}-{filter-codes}.{ext}
 */
export function generateExportFilename(
  format: "csv" | "json" | "pdf",
  filters?: Record<string, any>
): string {
  // Get current timestamp
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

  // Generate filter codes
  const filterCodes: string[] = [];
  if (filters) {
    if (filters.origins && Array.isArray(filters.origins)) {
      filterCodes.push(`o${filters.origins.length}`);
    }
    if (filters.language) {
      filterCodes.push(`l${filters.language}`);
    }
    if (filters.hasAudio) {
      filterCodes.push("a");
    }
    if (filters.hasAttributes) {
      filterCodes.push("attr");
    }
    if (filters.wordLengthMin || filters.wordLengthMax) {
      filterCodes.push("wl");
    }
  }

  const filterPart = filterCodes.length > 0 ? `-${filterCodes.join("-")}` : "";
  const baseName = `dictionary-export-${timestamp}${filterPart}`;

  // T136: Truncate filename to stay under 255 characters
  return truncateFilename(baseName, format);
}

/**
 * T136: Truncate filename to stay under 255 characters while preserving timestamp and extension
 */
export function truncateFilename(baseName: string, extension: string): string {
  const ext = `.${extension}`;
  const maxLength = 255;
  const maxBaseLength = maxLength - ext.length;

  if (baseName.length <= maxBaseLength) {
    return `${baseName}${ext}`;
  }

  // Keep timestamp and truncate filter codes
  const timestampMatch = baseName.match(/dictionary-export-(\d{8}-\d{6})/);
  if (timestampMatch) {
    const timestamp = timestampMatch[1];
    const prefix = `dictionary-export-${timestamp}`;
    const remaining = maxBaseLength - prefix.length;
    
    if (remaining > 10) {
      // Keep some filter codes
      const filterPart = baseName.substring(prefix.length);
      const truncatedFilter = filterPart.substring(0, remaining - 3) + "...";
      return `${prefix}${truncatedFilter}${ext}`;
    }
  }

  // Fallback: simple truncation
  return `${baseName.substring(0, maxBaseLength)}${ext}`;
}

/**
 * T132: Export to CSV format
 */
export function exportToCSV(
  results: Partial<DictionaryItem>[],
  fields: ExportFieldSelection
): string {
  if (results.length === 0) {
    return "";
  }

  // Build header row
  const headers: string[] = [];
  if (fields.word) headers.push("Word");
  if (fields.phonetic) headers.push("Phonetic");
  if (fields.origin) headers.push("Origin");
  if (fields.description) headers.push("Description");
  if (fields.attributes) headers.push("Attributes");
  if (fields.sourceData) headers.push("Source Data");

  // Build data rows
  const rows: string[][] = results.map((item) => {
    const row: string[] = [];
    
    if (fields.word) {
      row.push(escapeCSV(item.word || ""));
    }
    if (fields.phonetic) {
      row.push(escapeCSV(item.phonetic || ""));
    }
    if (fields.origin) {
      row.push(escapeCSV(item.origin || ""));
    }
    if (fields.description) {
      row.push(escapeCSV(item.description || ""));
    }
    if (fields.attributes) {
      const attrStr = Array.isArray(item.attributes)
        ? item.attributes.map((a) => `${a.key}:${a.value}`).join("; ")
        : "";
      row.push(escapeCSV(attrStr));
    }
    if (fields.sourceData) {
      const sourceStr = item.sourceData ? JSON.stringify(item.sourceData) : "";
      row.push(escapeCSV(sourceStr));
    }

    return row;
  });

  // Combine into CSV string
  const csvRows = [headers, ...rows];
  return csvRows.map((row) => row.join(",")).join("\n");
}

/**
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  // Wrap in quotes if contains comma, newline, or quote
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * T133: Export to JSON format
 */
export function exportToJSON(
  results: Partial<DictionaryItem>[],
  fields: ExportFieldSelection
): string {
  const filteredResults = results.map((item) => {
    const filtered: Partial<DictionaryItem> = {};

    if (fields.word) filtered.word = item.word;
    if (fields.phonetic) filtered.phonetic = item.phonetic;
    if (fields.origin) filtered.origin = item.origin;
    if (fields.description) filtered.description = item.description;
    if (fields.attributes) filtered.attributes = item.attributes;
    if (fields.sourceData) filtered.sourceData = item.sourceData;

    // Always include ID for reference
    filtered.id = item.id;

    return filtered;
  });

  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      totalResults: results.length,
      results: filteredResults,
    },
    null,
    2
  );
}

/**
 * T134: Export to PDF format using jsPDF
 * This function is designed to be lazy-loaded
 */
export async function exportToPDF(
  results: Partial<DictionaryItem>[],
  fields: ExportFieldSelection
): Promise<Blob> {
  // Lazy load jsPDF
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  // Set up document
  doc.setFontSize(12);
  doc.text("Dictionary Export", 14, 20);
  doc.setFontSize(10);
  doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, 27);
  doc.text(`Total Results: ${results.length}`, 14, 34);

  let yPosition = 45;
  const pageHeight = doc.internal.pageSize.height;
  const marginBottom = 20;

  // Add each result
  results.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - marginBottom) {
      doc.addPage();
      yPosition = 20;
    }

    // Result number
    doc.setFontSize(11);
    doc.text(`${index + 1}.`, 14, yPosition);
    yPosition += 7;

    // Word
    if (fields.word && item.word) {
      doc.setFont(undefined, "bold");
      doc.text(`Word: ${item.word}`, 20, yPosition);
      doc.setFont(undefined, "normal");
      yPosition += 6;
    }

    // Phonetic
    if (fields.phonetic && item.phonetic) {
      doc.text(`Phonetic: ${item.phonetic}`, 20, yPosition);
      yPosition += 6;
    }

    // Origin
    if (fields.origin && item.origin) {
      doc.text(`Origin: ${item.origin}`, 20, yPosition);
      yPosition += 6;
    }

    // Description (split into lines if too long)
    if (fields.description && item.description) {
      const desc = item.description.substring(0, 200); // Limit length
      const lines = doc.splitTextToSize(`Description: ${desc}`, 170);
      doc.text(lines, 20, yPosition);
      yPosition += lines.length * 6;
    }

    // Attributes
    if (fields.attributes && item.attributes && item.attributes.length > 0) {
      const attrStr = item.attributes
        .map((a) => `${a.key}:${a.value}`)
        .join(", ")
        .substring(0, 150);
      const lines = doc.splitTextToSize(`Attributes: ${attrStr}`, 170);
      doc.text(lines, 20, yPosition);
      yPosition += lines.length * 6;
    }

    yPosition += 5; // Space between entries
  });

  // Return as blob
  return doc.output("blob");
}

/**
 * T140: Process results in chunks to prevent memory issues
 */
export function* processInChunks<T>(
  items: T[],
  chunkSize: number = 100
): Generator<T[], void, unknown> {
  for (let i = 0; i < items.length; i += chunkSize) {
    yield items.slice(i, i + chunkSize);
  }
}

/**
 * Download a file to the user's device
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

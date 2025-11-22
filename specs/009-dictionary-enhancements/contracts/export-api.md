# Export API Contract

**Feature**: Dictionary System Enhancements  
**API Type**: Next.js Server Actions with Streaming Responses  
**Authentication**: Required (export feature for authenticated users only)

## Overview

This contract defines the API for exporting dictionary search results in various formats (CSV, JSON, PDF).

## Server Actions

### 1. exportDictionaryWords

Export dictionary search results to file.

**Function Signature**:
```typescript
async function exportDictionaryWords(
  params: ExportParams
): Promise<ExportResponse>
```

**Request Parameters**:
```typescript
interface ExportParams {
  format: "csv" | "json" | "pdf";
  query: string;                    // Search query
  filters: UserFilter;              // Active filters
  fields?: string[];                // Fields to include (optional, defaults to all)
  includeMetadata?: boolean;        // Include sourceData field (default: false)
  maxEntries?: number;              // Limit export size (default: 1000, max: 10000)
}
```

**Response**:
```typescript
type ExportResponse = 
  | {
      status: "success";
      data: {
        downloadUrl: string;        // Temporary download URL (1-hour expiry)
        filename: string;           // Generated filename
        fileSize: number;           // File size in bytes
        entryCount: number;         // Number of entries exported
        expiresAt: Date;           // URL expiration timestamp
      };
    }
  | {
      status: "error";
      error: string;
    };
```

**Validation Rules** (FR-013, FR-013a, FR-013b, FR-014):
- `format`: Must be "csv", "json", or "pdf"
- `query`: Required, 1-100 characters
- `filters`: Must be valid UserFilter object
- `fields`: If provided, must be array of valid DictionaryWord field names
- `maxEntries`: Must be between 1 and 10,000

**Filename Generation** (FR-013a):
```typescript
// Pattern: dictionary-export-{YYYYMMDD-HHMMSS}-{filter-codes}.{ext}
// Example: dictionary-export-20251115-143022-mw-ap90-len5-10.csv

function generateFilename(params: ExportParams): string {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19); // YYYYMMDD-HHMMSS
  
  const filterCodes: string[] = [];
  
  if (params.filters.origins?.length) {
    filterCodes.push(...params.filters.origins);
  }
  
  if (params.filters.wordLengthMin !== null || params.filters.wordLengthMax !== null) {
    const min = params.filters.wordLengthMin || 0;
    const max = params.filters.wordLengthMax || 999;
    filterCodes.push(`len${min}-${max}`);
  }
  
  if (params.filters.hasAudio) {
    filterCodes.push('audio');
  }
  
  const filterString = filterCodes.join('-');
  let filename = `dictionary-export-${timestamp}`;
  
  if (filterString) {
    filename += `-${filterString}`;
  }
  
  // Truncate to max 200 chars (leaving room for extension)
  if (filename.length > 200) {
    filename = filename.substring(0, 197) + '...';
  }
  
  return `${filename}.${params.format}`;
}
```

**Performance Requirements** (SC-006):
- CSV/JSON: Complete within 5 seconds for 1000 entries
- PDF: Complete within 15 seconds for 1000 entries
- Large exports (1000+): Use streaming to prevent memory issues

**Error Cases**:
- Authentication required: "Export feature requires authentication"
- Invalid format: "Export format must be 'csv', 'json', or 'pdf'"
- Too many entries: "Export limited to 10,000 entries. Refine your search filters."
- Export failed: "Export generation failed: [error details]"
- Quota exceeded: "Daily export quota exceeded (max 100 exports per day)"

**Example Usage**:
```typescript
const response = await exportDictionaryWords({
  format: "csv",
  query: "नमस्ते",
  filters: {
    origins: ["mw", "ap90"],
    wordLengthMin: 5,
    wordLengthMax: 10
  },
  fields: ["word", "phonetic", "description"],
  maxEntries: 1000
});

if (response.status === "success") {
  console.log(`Export ready: ${response.data.filename}`);
  console.log(`Download: ${response.data.downloadUrl}`);
  console.log(`Expires: ${response.data.expiresAt}`);
  
  // Trigger browser download
  window.open(response.data.downloadUrl, '_blank');
}
```

### 2. getExportProgress

Check progress of a long-running export operation.

**Function Signature**:
```typescript
async function getExportProgress(
  exportId: string
): Promise<ExportProgressResponse>
```

**Request Parameters**:
- `exportId`: Unique identifier for the export job

**Response**:
```typescript
type ExportProgressResponse = 
  | {
      status: "success";
      data: {
        state: "pending" | "processing" | "completed" | "failed";
        progress: number;           // 0-100 percentage
        entriesProcessed: number;
        totalEntries: number;
        estimatedTimeRemaining?: number; // seconds
        downloadUrl?: string;       // Available when state is "completed"
        error?: string;             // Present when state is "failed"
      };
    }
  | {
      status: "error";
      error: string;
    };
```

**Use Case**: For exports >1000 entries that may take longer than typical request timeout

**Example Usage**:
```typescript
// Initiate export
const exportResponse = await exportDictionaryWords({
  format: "pdf",
  query: "सूक्त",
  filters: { origins: ["mw"] },
  maxEntries: 5000
});

if (exportResponse.status === "success" && exportResponse.data.exportId) {
  // Poll for progress
  const checkProgress = setInterval(async () => {
    const progress = await getExportProgress(exportResponse.data.exportId);
    
    if (progress.status === "success") {
      if (progress.data.state === "completed") {
        clearInterval(checkProgress);
        console.log("Export ready!");
        window.open(progress.data.downloadUrl, '_blank');
      } else if (progress.data.state === "failed") {
        clearInterval(checkProgress);
        console.error("Export failed:", progress.data.error);
      } else {
        console.log(`Progress: ${progress.data.progress}%`);
      }
    }
  }, 2000); // Check every 2 seconds
}
```

### 3. cancelExport

Cancel an in-progress export operation.

**Function Signature**:
```typescript
async function cancelExport(
  exportId: string
): Promise<CancelResponse>
```

**Request Parameters**:
- `exportId`: Export job ID to cancel

**Response**:
```typescript
type CancelResponse = 
  | {
      status: "success";
      data: { cancelled: true };
    }
  | {
      status: "error";
      error: string;
    };
```

**Error Cases**:
- Not found: "Export job not found"
- Already completed: "Cannot cancel completed export"
- Unauthorized: "You don't have permission to cancel this export"

**Example Usage**:
```typescript
const response = await cancelExport("export_abc123");

if (response.status === "success") {
  console.log("Export cancelled successfully");
}
```

## Export Format Specifications

### CSV Format

**Structure**:
```csv
word,phonetic,origin,description,language,attributes
"नमस्ते","namaste","mw","salutation; greeting","sa","grammar=interjection"
"नमः","namaḥ","ap90","bow; obeisance","sa","grammar=noun,gender=neuter"
```

**Encoding**: UTF-8 with BOM for Excel compatibility  
**Delimiter**: Comma (`,`)  
**Quote Character**: Double quote (`"`)  
**Escape**: Double quote (`""`)  
**Line Ending**: CRLF (`\r\n`)

**Field Mapping**:
- `word`: First entry from `word[]` array in user's preferred language
- `phonetic`: Direct from `phonetic` field
- `origin`: Direct from `origin` field
- `description`: First entry from `description[]` array
- `language`: Language code of the word entry
- `attributes`: Serialized as key=value pairs, pipe-separated

### JSON Format

**Structure**:
```json
{
  "metadata": {
    "exportDate": "2025-11-15T14:30:22.000Z",
    "query": "नमस्ते",
    "filters": {
      "origins": ["mw", "ap90"],
      "wordLengthMin": 5,
      "wordLengthMax": 10
    },
    "totalEntries": 42,
    "format": "json"
  },
  "entries": [
    {
      "id": "507f1f77bcf86cd799439011",
      "origin": "mw",
      "wordIndex": 12345,
      "word": [
        { "language": "sa", "value": "नमस्ते" },
        { "language": "iast", "value": "namaste" }
      ],
      "phonetic": "namaste",
      "description": [
        { "language": "en", "value": "salutation; greeting" }
      ],
      "attributes": [
        { "key": "grammar", "value": "interjection" }
      ]
    }
  ]
}
```

**Encoding**: UTF-8  
**Formatting**: Pretty-printed with 2-space indentation  
**Field Mapping**: Complete DictionaryWord object (all fields)

### PDF Format

**Layout**:
- **Header**: Export title, query, filters, date
- **Body**: Table with columns: Word, Phonetic, Origin, Description
- **Footer**: Page numbers, total entry count

**Styling**:
- **Font**: Noto Sans Devanagari (for Sanskrit), Noto Sans Telugu (for Telugu), Arial (for Latin)
- **Font Size**: 10pt body, 12pt headers
- **Page Size**: A4
- **Margins**: 1 inch on all sides
- **Orientation**: Portrait (auto-switch to landscape if word descriptions are long)

**Features**:
- Table of contents for large exports (>100 entries)
- Hyperlinked origin codes to dictionary references
- Word-wrapping for long descriptions
- Page breaks respect entry boundaries (no split entries)

**Library**: jsPDF with custom font embedding for Unicode support

## Rate Limiting & Quotas

- **Exports per day**: 100 per user (authenticated)
- **Concurrent exports**: 3 per user
- **Export size**: Max 10,000 entries per export
- **Total daily export data**: 100 MB per user

**Quota exceeded response**:
```json
{
  "status": "error",
  "error": "Daily export quota exceeded. Quota resets at midnight UTC. Current usage: 98/100 exports."
}
```

## File Storage & Cleanup

- **Storage**: Temporary S3 bucket or local filesystem with expiry
- **Retention**: Export files deleted after 1 hour
- **Cleanup**: Automated cron job runs every 30 minutes
- **URL expiry**: Pre-signed URLs expire after 1 hour

## Security

- **Authentication**: Required for all export operations
- **Authorization**: Users can only export their own search results
- **Input sanitization**: All query and filter inputs sanitized to prevent injection
- **File validation**: Output files scanned for malicious content before serving
- **Rate limiting**: Per-user quotas prevent abuse

## Accessibility

- **CSV**: Compatible with screen reader-accessible spreadsheet software
- **JSON**: Structured for programmatic access (no accessibility concerns)
- **PDF**: Tagged PDF with proper reading order, alt text for headers

## Testing Requirements

### Unit Tests

- Filename generation with various filter combinations
- Truncation logic for long filenames
- CSV escaping and quote handling
- JSON serialization accuracy
- PDF Unicode font rendering

### Integration Tests

1. **Small export (100 entries)**: CSV, JSON, PDF formats
2. **Large export (5000 entries)**: Streaming behavior, memory usage
3. **Special characters**: Sanskrit, Telugu, diacritics in all formats
4. **Filter codes**: Filename reflects active filters correctly
5. **Progress tracking**: Long-running export reports accurate progress
6. **Quota enforcement**: Daily limit prevents over 100 exports

### Performance Tests

- **CSV 1000 entries**: <5 seconds
- **JSON 1000 entries**: <5 seconds
- **PDF 1000 entries**: <15 seconds
- **Memory usage**: <500 MB for 10,000 entry export

### Contract Tests

- Response structure matches TypeScript interface
- Download URLs are valid and accessible
- File contents match expected format specifications
- Expiry timestamps are accurate (1 hour from generation)

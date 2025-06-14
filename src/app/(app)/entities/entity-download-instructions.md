# Entity Download & Upload Functionality

## Overview

Implement server actions for downloading and uploading entity hierarchies as zip files, optimized to avoid database overfetching while preserving complete hierarchical structure.

## Download Functionality Requirements

### File Naming Strategy

- Generate zip file name using entity type and title from multiple language sources
- Priority order: SLP1, IAST, ITRANS, ENG languages
- Format: `{type}_{title}_{timestamp}.zip`

### Hierarchical Structure Processing

- Use `ENTITY_TYPES_CHILDREN` constant to determine valid parent-child relationships
- Process entities recursively following the hierarchy depth
- Example hierarchy: PURANAM → PARVAM → ADHYAAYAM → SLOKAM

### Zip File Contents

#### Structure Information File

- `structure_info.json`: Contains hierarchy metadata and statistics
- Include entity counts, depth levels, and file mapping
- Provide restoration metadata for upload functionality

#### Entity Files Organization

- **Root Entity File**: Contains parent entity data with child file references
- **Intermediate Level Files**: Contains entity data with references to child files
- **Leaf Level Files**: Contains entity data with embedded children as complete objects

### Database Optimization Strategy

- Implement selective field projection to minimize data transfer
- Use aggregation pipelines for efficient hierarchical queries
- Batch process children entities to avoid N+1 query problems
- Cache frequently accessed entity type configurations

### File Structure Rules

1. Each non-leaf entity creates separate JSON file
2. Leaf entities are embedded within their parent files
3. File names derived from entity order, type, and primary language text
4. Cross-references maintained through fileName properties

## Upload Functionality Requirements

### Validation Process

- Verify zip file structure matches expected format
- Validate `structure_info.json` schema compliance
- Check entity type hierarchy consistency using `ENTITY_TYPES_CHILDREN`
- Ensure required language fields are present

### Import Strategy

- Process files in hierarchical order (root → leaves)
- Create entities with proper parent-child relationships
- Handle duplicate detection based on text content and type
- Maintain original ordering and attributes

### Error Handling

- Provide detailed validation error messages
- Support partial import with rollback capability
- Generate import summary with success/failure counts
- Log import process for debugging

### Data Integrity

- Verify parent-child relationship consistency
- Validate entity type transitions follow allowed patterns
- Ensure language text completeness across required fields
- Maintain attribute and meaning data integrity

## Technical Implementation Notes

### Server Action Structure

- Separate actions for download and upload operations
- Type-safe parameter validation using Zod schemas
- Proper error response formatting with discriminated unions
- Progress tracking for large hierarchies

### Performance Considerations

- Stream processing for large zip files
- Memory-efficient JSON parsing for bulk operations
- Chunked database operations to prevent timeouts
- Optimistic locking for concurrent upload prevention

### Security Requirements

- File size limits for zip uploads
- MIME type validation for uploaded files
- User authentication and authorization checks
- Rate limiting for download/upload operations

### Response Types

- Download: Return blob URL for zip file download
- Upload: Return import summary with entity count statistics
- Both: Include detailed error information for failed operations

### Sample File Structures

#### structure_info.json

```json
{
  "stats": {
    "totalEntities": 1250,
    "maxDepth": 4,
    "entityCounts": {
      "PURANAM": 1,
      "PARVAM": 12,
      "ADHYAAYAM": 108,
      "SLOKAM": 1129
    }
  },
  "hierarchy": {
    "fileName": "shrimad_bhagavatam_puranam.json",
    "children": [
      {
        "fileName": "0001_parvam.json",
        "children": [
          { "fileName": "0001_0001_adhyaayam.json" },
          { "fileName": "0001_0002_adhyaayam.json" }
        ]
      },
      {
        "fileName": "0002_parvam.json",
        "children": [
          { "fileName": "0002_0001_adhyaayam.json" },
          { "fileName": "0002_0002_adhyaayam.json" }
        ]
      }
    ]
  }
}
```

#### Root Entity File (shrimad_bhagavatam_puranam.json)

```json
{
  "id": "674a1b2c3d4e5f6789abcdef",
  "type": "PURANAM",
  "text": [{ "language": "SLP1", "value": "SrImad BAgavatam" }],
  "meaning": [
    { "language": "ENG", "value": "The Beautiful Story of the Fortunate One" }
  ],
  "childrenIds": ["674a1b2c3d4e5f6789abcd01", "674a1b2c3d4e5f6789abcd02"],
  "order": 0,
  "bookmarked": false
}
```

#### Intermediate Entity File (0001_parvam.json)

```json
{
  "id": "674a1b2c3d4e5f6789abcd01",
  "type": "PARVAM",
  "text": [{ "language": "SLP1", "value": "praTamaH skandaH" }],
  "meaning": [{ "language": "ENG", "value": "First Canto" }],
  "childrenIds": ["674a1b2c3d4e5f6789abcd11", "674a1b2c3d4e5f6789abcd12"],
  "order": 1
}
```

#### Leaf Container File (0001_0001_adhyaayam.json)

```json
{
  "id": "674a1b2c3d4e5f6789abcd11",
  "type": "ADHYAAYAM",
  "text": [{ "language": "SLP1", "value": "parIkSit rAjA" }],
  "children": [
    {
      "id": "674a1b2c3d4e5f6789abcd21",
      "type": "SLOKAM",
      "text": [{ "language": "SLP1", "value": "Darma-kSetreH kuru-kSetreH" }],
      "order": 1
    }
  ]
}
```

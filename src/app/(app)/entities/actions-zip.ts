"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ENTITY_TYPES_CHILDREN } from "@/lib/constants";
import JSZip from "jszip";
import { Entity } from "@/lib/types";

interface HierarchyStructure {
  fileName: string;
  childCount: number; // Number of direct children
  totalChildCount: number; // Total count of all descendants (excluding self)
  children?: HierarchyStructure[];
}

interface EntityCounts {
  [entityType: string]: number;
}

interface StructureInfo {
  stats: {
    totalEntities: number;
    maxDepth: number;
    entityCounts: EntityCounts;
    createdAt: string;
    rootEntityType: string;
  };
  hierarchy: HierarchyStructure;
}

interface EntityWithChildren extends Entity {
  childrenData?: EntityWithChildren[];
  dbChildren?: string[]; // Original children IDs from database
  dbParents?: string[]; // Original parent IDs from database
}

/**
 * Server action to download entity hierarchy as a ZIP file
 */
export async function downloadEntityHierarchyZip(
  entityId: string,
  asBase64 = true,
): Promise<{
  success: boolean;
  data?: string | Buffer<ArrayBufferLike>; // base64 encoded zip data
  filename?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch the root entity with hierarchy
    const rootEntity = await fetchEntityWithHierarchy(entityId);
    if (!rootEntity) {
      return { success: false, error: "Entity not found" };
    }

    // Generate filename from entity type and text
    const filename = generateZipFilename(rootEntity);

    // Create ZIP structure
    const zip = new JSZip();
    const entityCounts: EntityCounts = {};

    // Build hierarchical structure and add files to ZIP
    const { structure, totalEntities, maxDepth } =
      await buildHierarchyStructure(
        rootEntity,
        zip,
        0,
        entityCounts,
        0, // current index within this level
        [], // parent hierarchy indexes
      );

    const structureInfo: StructureInfo = {
      stats: {
        totalEntities,
        maxDepth,
        entityCounts,
        createdAt: new Date().toISOString(),
        rootEntityType: rootEntity.type,
      },
      hierarchy: structure,
    };

    // Add structure info file with explicit encoding
    const structureInfoContent = JSON.stringify(structureInfo, null, 2);
    zip.file("000_structure_info.json", structureInfoContent, {
      binary: false,
      date: new Date(),
    });

    // Generate ZIP buffer with maximum compression and explicit options
    let zipBuffer: Buffer;
    try {
      zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }, // Maximum compression
        platform: "UNIX", // Consistent platform for filenames
        streamFiles: true, // Use streaming for large files
      });
    } catch (zipError) {
      console.error("Error generating ZIP:", zipError);

      // If ZIP generation fails, try with minimal compression
      try {
        console.log("Retrying ZIP generation with minimal compression...");
        zipBuffer = await zip.generateAsync({
          type: "nodebuffer",
          compression: "STORE", // No compression
          platform: "UNIX",
          streamFiles: false,
        });
      } catch (fallbackError) {
        console.error("Fallback ZIP generation also failed:", fallbackError);
        throw new Error(
          `ZIP generation failed: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
        );
      }
    }

    // Check size before converting to base64
    const zipSizeMB = zipBuffer.length / (1024 * 1024);
    console.log(`ZIP file size: ${zipSizeMB.toFixed(2)} MB`);

    if (asBase64 && zipSizeMB > 0.7) {
      // Leave some room for base64 encoding overhead
      return {
        success: false,
        error: `ZIP file too large: ${zipSizeMB.toFixed(2)} MB. Please use a smaller entity hierarchy or implement file upload.`,
      };
    }

    const finalData = asBase64 ? zipBuffer.toString("base64") : zipBuffer;

    return {
      success: true,
      data: finalData,
      filename,
    };
  } catch (error) {
    console.error("Error creating ZIP:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Server action to upload and restore entity hierarchy from ZIP file
 */
export async function uploadEntityHierarchyZip(
  base64Data: string,
  parentId?: string,
): Promise<{
  success: boolean;
  data?: { entityId: string; totalEntities: number };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Convert base64 to buffer
    const zipBuffer = Buffer.from(base64Data, "base64");

    // Load ZIP file
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);

    // Read structure info
    const structureInfoFile = zip.file("000_structure_info.json");
    if (!structureInfoFile) {
      return {
        success: false,
        error: "Invalid ZIP: missing 000_structure_info.json",
      };
    }

    const structureInfoContent = await structureInfoFile.async("text");
    const structureInfo: StructureInfo = JSON.parse(structureInfoContent);

    // Validate structure
    if (!structureInfo.hierarchy || !structureInfo.hierarchy.fileName) {
      return {
        success: false,
        error: "Invalid 000_structure_info.json format",
      };
    }

    // Restore entity hierarchy
    const result = await restoreEntityHierarchy(
      zip,
      structureInfo.hierarchy,
      parentId,
    );

    return {
      success: true,
      data: {
        entityId: result.entityId,
        totalEntities: result.totalEntities,
      },
    };
  } catch (error) {
    console.error("Error uploading ZIP:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch entity with complete hierarchy using efficient bulk fetching
 */
async function fetchEntityWithHierarchy(
  entityId: string,
): Promise<EntityWithChildren | null> {
  // First, fetch all entities in the hierarchy with a single recursive query
  const allEntities = await fetchAllEntitiesInHierarchy(entityId);
  if (allEntities.length === 0) return null;

  // Create a map for quick lookups
  const entityMap = new Map(allEntities.map((entity) => [entity.id, entity]));

  // Build the hierarchy starting from the root
  return buildEntityHierarchy(entityId, entityMap);
}

/**
 * Fetch all entities in hierarchy with a single recursive operation
 */
async function fetchAllEntitiesInHierarchy(rootId: string) {
  const visited = new Set<string>();
  const entities: any[] = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const currentBatch = queue.splice(0, 50); // Process in batches of 50
    const unvisitedIds = currentBatch.filter((id) => !visited.has(id));

    if (unvisitedIds.length === 0) continue;

    const batchEntities = await db.entity.findMany({
      where: { id: { in: unvisitedIds } },
      select: {
        id: true,
        type: true,
        text: true,
        meaning: true,
        imageThumbnail: true,
        audio: true,
        order: true,
        attributes: true,
        notes: true,
        bookmarked: true,
        children: true,
        parents: true,
      },
    });

    for (const entity of batchEntities) {
      if (!visited.has(entity.id)) {
        visited.add(entity.id);
        entities.push(entity);

        // Add children to queue for next batch
        if (entity.children && entity.children.length > 0) {
          queue.push(
            ...entity.children.filter((childId) => !visited.has(childId)),
          );
        }
      }
    }
  }

  return entities;
}

/**
 * Build entity hierarchy from pre-fetched entity map
 */
function buildEntityHierarchy(
  entityId: string,
  entityMap: Map<string, any>,
): EntityWithChildren | null {
  const entity = entityMap.get(entityId);
  if (!entity) return null;

  const mappedEntity: EntityWithChildren = {
    id: entity.id,
    type: entity.type as any,
    text: entity.text as any,
    meaning: entity.meaning as any,
    imageThumbnail: entity.imageThumbnail || undefined,
    audio: entity.audio || undefined,
    order: entity.order,
    attributes: entity.attributes as any,
    notes: entity.notes || undefined,
    bookmarked: entity.bookmarked,
    dbChildren: entity.children || [],
    dbParents: entity.parents || [],
  };

  // Build children hierarchy from the map
  if (entity.children && entity.children.length > 0) {
    const childrenWithHierarchy = entity.children
      .map((childId: string) => buildEntityHierarchy(childId, entityMap))
      .filter(Boolean) as EntityWithChildren[];

    // Sort children by order
    childrenWithHierarchy.sort((a, b) => (a.order || 0) - (b.order || 0));
    mappedEntity.childrenData = childrenWithHierarchy;
  }

  return mappedEntity;
}

/**
 * Build hierarchical structure following the specifications
 */
async function buildHierarchyStructure(
  entity: EntityWithChildren,
  zip: JSZip,
  depth: number,
  entityCounts: EntityCounts,
  currentIndex: number,
  parentIndexes: number[], // Array of parent hierarchy indexes
): Promise<{
  structure: HierarchyStructure;
  totalEntities: number;
  maxDepth: number;
  nextIndex: number;
}> {
  const hasChildren = entity.childrenData && entity.childrenData.length > 0;
  const childrenTypes =
    ENTITY_TYPES_CHILDREN[entity.type as keyof typeof ENTITY_TYPES_CHILDREN] ||
    [];
  const isLeafNode =
    childrenTypes.length === 0 ||
    childrenTypes.every((type) => type === "SLOKAM");

  // Update entity counts
  entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;

  let totalEntities = 1;
  let maxDepth = depth;

  // Generate filename with parent hierarchy indexes
  const fileName = generateEntityFileName(
    entity,
    currentIndex,
    parentIndexes,
    depth,
  );

  const structure: HierarchyStructure = {
    fileName,
    childCount: 0, // Will be updated based on children processing
    totalChildCount: 0, // Initially 0, will accumulate children counts only
  };

  // Prepare entity data for file
  const entityData: any = {
    id: entity.id,
    type: entity.type,
    text: entity.text,
    meaning: entity.meaning,
    imageThumbnail: entity.imageThumbnail,
    audio: entity.audio,
    order: entity.order,
    attributes: entity.attributes,
    notes: entity.notes,
    bookmarked: entity.bookmarked,
  };

  if (isLeafNode && hasChildren) {
    // For leaf nodes (like ADHYAAYAM), include all children (SLOKAM) in the same file
    const childrenData = entity.childrenData!.map((child) => {
      entityCounts[child.type] = (entityCounts[child.type] || 0) + 1;
      return {
        id: child.id,
        type: child.type,
        text: child.text,
        meaning: child.meaning,
        imageThumbnail: child.imageThumbnail,
        audio: child.audio,
        order: child.order,
        attributes: child.attributes,
        notes: child.notes,
        bookmarked: child.bookmarked,
      };
    });

    entityData.children = childrenData;
    structure.childCount = childrenData.length;
    structure.totalChildCount = childrenData.length; // Only inline children count
    totalEntities += childrenData.length;
  } else if (hasChildren) {
    // For non-leaf nodes, create separate files for children and store references
    const childStructures: HierarchyStructure[] = [];
    const childrenIds: string[] = [];

    // Create new parent hierarchy:
    // - If this is the root entity (depth 0), start with empty array for first level
    // - For all other entities, include their index in the parent hierarchy
    const childParentIndexes =
      depth === 0
        ? [] // Root entity's children start with no parent prefix, but will get their own index
        : [...parentIndexes, currentIndex];

    for (let i = 0; i < entity.childrenData!.length; i++) {
      const child = entity.childrenData![i];
      const childResult = await buildHierarchyStructure(
        child,
        zip,
        depth + 1,
        entityCounts,
        i, // Reset index for each level
        childParentIndexes, // Pass parent hierarchy
      );

      childStructures.push(childResult.structure);
      childrenIds.push(child.id);
      totalEntities += childResult.totalEntities;
      maxDepth = Math.max(maxDepth, childResult.maxDepth);
    }

    structure.children = childStructures;
    structure.childCount = childStructures.length;
    // Calculate total count: direct children + sum of all children's totalChildCounts
    structure.totalChildCount =
      childStructures.length +
      childStructures.reduce((sum, child) => sum + child.totalChildCount, 0);
    entityData.childrenIds = childrenIds;
  }

  // Add entity file to ZIP with explicit encoding options
  const jsonContent = JSON.stringify(entityData, null, 2);

  // Ensure the JSON content is properly encoded as UTF-8
  try {
    zip.file(fileName, jsonContent, {
      binary: false,
      date: new Date(),
    });
  } catch (error) {
    console.error(`Error adding file ${fileName} to ZIP:`, error);
    console.error("Entity data causing issue:", {
      id: entity.id,
      type: entity.type,
      textLength: entity.text?.length || 0,
      fileName: fileName,
    });
    throw error;
  }

  return {
    structure,
    totalEntities,
    maxDepth,
    nextIndex: currentIndex + 1, // Return next index for this level
  };
}

/**
 * Restore entity hierarchy from ZIP following the specifications
 */
async function restoreEntityHierarchy(
  zip: JSZip,
  structure: HierarchyStructure,
  parentId?: string,
): Promise<{ entityId: string; totalEntities: number }> {
  // Read entity file
  const entityFile = zip.file(structure.fileName);
  if (!entityFile) {
    throw new Error(`Entity file not found: ${structure.fileName}`);
  }

  const entityContent = await entityFile.async("text");
  const entityData = JSON.parse(entityContent);

  // Remove the original ID and children references to create a new entity
  const {
    id: originalId,
    childrenIds,
    children,
    ...entityToCreate
  } = entityData;

  // Set parent relationship
  if (parentId) {
    entityToCreate.parents = [parentId];
  }

  // Create the entity
  const createdEntity = await db.entity.create({
    data: entityToCreate,
  });

  let totalEntities = 1;

  // Handle children
  if (children && Array.isArray(children)) {
    // For leaf nodes with inline children data (like ADHYAAYAM with SLOKAM)
    const childIds: string[] = [];

    for (const childData of children) {
      const { id: childOriginalId, ...childToCreate } = childData;
      childToCreate.parents = [createdEntity.id];

      const createdChild = await db.entity.create({
        data: childToCreate,
      });

      childIds.push(createdChild.id);
      totalEntities++;
    }

    // Update parent with child IDs
    if (childIds.length > 0) {
      await db.entity.update({
        where: { id: createdEntity.id },
        data: { children: childIds },
      });
    }
  } else if (structure.children && structure.children.length > 0) {
    // For non-leaf nodes with separate child files
    const childIds: string[] = [];

    for (const childStructure of structure.children) {
      const childResult = await restoreEntityHierarchy(
        zip,
        childStructure,
        createdEntity.id,
      );
      childIds.push(childResult.entityId);
      totalEntities += childResult.totalEntities;
    }

    // Update parent with child IDs
    if (childIds.length > 0) {
      await db.entity.update({
        where: { id: createdEntity.id },
        data: { children: childIds },
      });
    }
  }

  // Update parent if this is not the root entity
  if (parentId) {
    await db.entity.update({
      where: { id: parentId },
      data: {
        children: {
          push: createdEntity.id,
        },
      },
    });
  }

  return {
    entityId: createdEntity.id,
    totalEntities,
  };
}

/**
 * Generate entity filename following the specification format
 * Format: {parent_indexes}_{current_index}_{type}_{title}.json (for non-root entities)
 * Format: {type}_{title}.json (for root entity only)
 */
function generateEntityFileName(
  entity: EntityWithChildren,
  currentIndex: number,
  parentIndexes: number[],
  depth: number = 0, // Add depth parameter to distinguish root from first-level
): string {
  const languagePriority = ["SLP1", "IAST", "ITRANS", "ENG"];

  let title = entity.type.toLowerCase();

  // Try to get title from text in priority order
  if (entity.text && Array.isArray(entity.text)) {
    for (const lang of languagePriority) {
      const textEntry = entity.text.find((t: any) => t.language === lang);
      if (textEntry && textEntry.value && textEntry.value.trim()) {
        try {
          title = sanitizeFileName(textEntry.value.trim());
          if (title.length > 0) {
            break;
          }
        } catch (error) {
          console.warn(`Error sanitizing text for language ${lang}:`, error);
          continue;
        }
      }
    }
  }

  // Fallback to entity ID if title is still empty or unsafe
  if (!title || title.length === 0) {
    title = `entity_${entity.id.slice(-8)}`;
  }

  const type = entity.type.toLowerCase();

  // Only the true root entity (depth 0) gets simple format: type_title.json
  if (depth === 0) {
    return `000_${type}_${title}.json`;
  }

  // All other entities (depth > 0) include hierarchy: parent1_parent2_current_type_title.json
  const allIndexes = [...parentIndexes, currentIndex];
  const hierarchyPrefix = allIndexes
    .map((idx) => String(idx + 1).padStart(3, "0"))
    .join("_");

  return `${hierarchyPrefix}_${type}_${title}.json`;
}

/**
 * Generate ZIP filename from entity type and text
 * Format: {type}_{title}_{timestamp}.zip
 */
function generateZipFilename(entity: EntityWithChildren): string {
  const languagePriority = ["SLP1", "IAST", "ITRANS", "ENG"];

  let title = entity.type.toLowerCase();

  // Try to get title from text in priority order
  if (entity.text && Array.isArray(entity.text)) {
    for (const lang of languagePriority) {
      const textEntry = entity.text.find((t: any) => t.language === lang);
      if (textEntry && textEntry.value && textEntry.value.trim()) {
        title = textEntry.value.trim();
        break;
      }
    }
  }

  // Sanitize and format filename
  const sanitizedTitle = sanitizeFileName(title);
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  return `${entity.type.toLowerCase()}_${sanitizedTitle}_${timestamp}.zip`;
}

/**
 * Sanitize filename for cross-platform compatibility
 */
function sanitizeFileName(fileName: string): string {
  try {
    return fileName
      .normalize("NFD") // Normalize Unicode characters
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
      .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid filename characters
      .replace(/[^\x00-\x7F]/g, "_") // Replace non-ASCII characters with underscore
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/_{2,}/g, "_") // Replace multiple underscores with single
      .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
      .toLowerCase()
      .slice(0, 30); // Limit length for filename compatibility
  } catch (error) {
    console.error("Error sanitizing filename:", fileName, error);
    // Fallback to a simple safe filename
    return `entity_${Date.now()}`.slice(0, 30);
  }
}

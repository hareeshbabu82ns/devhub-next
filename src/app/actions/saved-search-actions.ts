/**
 * Saved Search Server Actions
 * 
 * Phase 7: User Story 4 (US4) - Saved Searches and Query History
 * Task: T97
 * 
 * Purpose: CRUD operations for saved searches with authentication
 * Features:
 * - Create saved search
 * - List user's saved searches
 * - Update saved search
 * - Delete saved search
 * - Get single saved search by ID
 */

"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type SavedSearchActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

export interface SavedSearchData {
  name: string;
  queryText: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: string;
}

export interface SavedSearchWithId extends SavedSearchData {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * T97: Create a new saved search
 */
export async function createSavedSearch(
  data: SavedSearchData
): Promise<SavedSearchActionResponse<SavedSearchWithId>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { status: "error", error: "Authentication required" };
    }

    // Validate data
    if (!data.name || data.name.trim().length === 0) {
      return { status: "error", error: "Search name is required" };
    }

    if (data.name.length > 100) {
      return { status: "error", error: "Search name must be 100 characters or less" };
    }

    // Check for duplicate name (optional - could allow duplicates)
    const existing = await db.savedSearch.findFirst({
      where: {
        userId: session.user.id,
        name: data.name,
      },
    });

    if (existing) {
      return {
        status: "error",
        error: "A saved search with this name already exists",
      };
    }

    // Create saved search
    const savedSearch = await db.savedSearch.create({
      data: {
        userId: session.user.id,
        name: data.name,
        queryText: data.queryText || "",
        filters: data.filters || {},
        sortBy: data.sortBy || "relevance",
        sortOrder: data.sortOrder || "desc",
      },
    });

    revalidatePath("/dictionary");

    return {
      status: "success",
      data: savedSearch as SavedSearchWithId,
    };
  } catch (error) {
    console.error("Error creating saved search:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to create saved search",
    };
  }
}

/**
 * T97: List all saved searches for the current user
 * Ordered by most recently updated (T105)
 */
export async function listSavedSearches(): Promise<
  SavedSearchActionResponse<SavedSearchWithId[]>
> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { status: "error", error: "Authentication required" };
    }

    const savedSearches = await db.savedSearch.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc", // T105: Most recently used first
      },
    });

    return {
      status: "success",
      data: savedSearches as SavedSearchWithId[],
    };
  } catch (error) {
    console.error("Error listing saved searches:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to list saved searches",
    };
  }
}

/**
 * T97: Get a single saved search by ID
 */
export async function getSavedSearch(
  id: string
): Promise<SavedSearchActionResponse<SavedSearchWithId>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { status: "error", error: "Authentication required" };
    }

    const savedSearch = await db.savedSearch.findFirst({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this search
      },
    });

    if (!savedSearch) {
      return { status: "error", error: "Saved search not found" };
    }

    return {
      status: "success",
      data: savedSearch as SavedSearchWithId,
    };
  } catch (error) {
    console.error("Error getting saved search:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to get saved search",
    };
  }
}

/**
 * T97: Update an existing saved search
 * T105: Updates the updatedAt timestamp for sorting by MRU
 */
export async function updateSavedSearch(
  id: string,
  data: Partial<SavedSearchData>
): Promise<SavedSearchActionResponse<SavedSearchWithId>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { status: "error", error: "Authentication required" };
    }

    // Verify ownership
    const existing = await db.savedSearch.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return { status: "error", error: "Saved search not found" };
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        return { status: "error", error: "Search name cannot be empty" };
      }

      if (data.name.length > 100) {
        return { status: "error", error: "Search name must be 100 characters or less" };
      }

      // Check for duplicate name (excluding current search)
      const duplicate = await db.savedSearch.findFirst({
        where: {
          userId: session.user.id,
          name: data.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        return {
          status: "error",
          error: "A saved search with this name already exists",
        };
      }
    }

    // Update saved search
    const updatedSearch = await db.savedSearch.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.queryText !== undefined && { queryText: data.queryText }),
        ...(data.filters !== undefined && { filters: data.filters }),
        ...(data.sortBy !== undefined && { sortBy: data.sortBy }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        updatedAt: new Date(), // T105: Update timestamp for MRU sorting
      },
    });

    revalidatePath("/dictionary");

    return {
      status: "success",
      data: updatedSearch as SavedSearchWithId,
    };
  } catch (error) {
    console.error("Error updating saved search:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to update saved search",
    };
  }
}

/**
 * T97: Delete a saved search
 */
export async function deleteSavedSearch(
  id: string
): Promise<SavedSearchActionResponse<void>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { status: "error", error: "Authentication required" };
    }

    // Verify ownership before deleting
    const existing = await db.savedSearch.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return { status: "error", error: "Saved search not found" };
    }

    await db.savedSearch.delete({
      where: { id },
    });

    revalidatePath("/dictionary");

    return {
      status: "success",
      data: undefined,
    };
  } catch (error) {
    console.error("Error deleting saved search:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to delete saved search",
    };
  }
}

/**
 * T97: Duplicate a saved search (creates a copy with " (Copy)" appended)
 */
export async function duplicateSavedSearch(
  id: string
): Promise<SavedSearchActionResponse<SavedSearchWithId>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { status: "error", error: "Authentication required" };
    }

    // Get original search
    const original = await db.savedSearch.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!original) {
      return { status: "error", error: "Saved search not found" };
    }

    // Create duplicate with " (Copy)" appended
    let newName = `${original.name} (Copy)`;
    let counter = 1;

    // Ensure unique name
    while (
      await db.savedSearch.findFirst({
        where: {
          userId: session.user.id,
          name: newName,
        },
      })
    ) {
      counter++;
      newName = `${original.name} (Copy ${counter})`;
    }

    const duplicate = await db.savedSearch.create({
      data: {
        userId: session.user.id,
        name: newName,
        queryText: original.queryText,
        filters: original.filters,
        sortBy: original.sortBy,
        sortOrder: original.sortOrder,
      },
    });

    revalidatePath("/dictionary");

    return {
      status: "success",
      data: duplicate as SavedSearchWithId,
    };
  } catch (error) {
    console.error("Error duplicating saved search:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to duplicate saved search",
    };
  }
}

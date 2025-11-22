/**
 * Saved Searches Hook
 * 
 * Phase 7: User Story 4 (US4) - Saved Searches and Query History
 * Task: T98
 * 
 * Purpose: Manage saved search state with TanStack Query
 * Features:
 * - List saved searches
 * - Create new saved search
 * - Update saved search
 * - Delete saved search
 * - Duplicate saved search
 * - Automatic refetching and cache invalidation
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  duplicateSavedSearch,
  getSavedSearch,
  SavedSearchData,
  SavedSearchWithId,
} from "@/app/actions/saved-search-actions";

const SAVED_SEARCHES_QUERY_KEY = ["savedSearches"];

/**
 * T98: Hook for managing saved searches with TanStack Query
 */
export function useSavedSearches() {
  const queryClient = useQueryClient();

  // Query for listing all saved searches
  const {
    data: savedSearches = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: SAVED_SEARCHES_QUERY_KEY,
    queryFn: async () => {
      const response = await listSavedSearches();
      if (response.status === "error") {
        throw new Error(response.error);
      }
      return response.data;
    },
    // Only run if user is authenticated (will fail otherwise)
    retry: false,
  });

  // Mutation for creating a saved search
  const createMutation = useMutation({
    mutationFn: createSavedSearch,
    onSuccess: (response) => {
      if (response.status === "success") {
        // Invalidate and refetch saved searches
        queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_QUERY_KEY });
        toast.success("Search saved successfully!");
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save search");
    },
  });

  // Mutation for updating a saved search
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SavedSearchData> }) =>
      updateSavedSearch(id, data),
    onSuccess: (response) => {
      if (response.status === "success") {
        queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_QUERY_KEY });
        toast.success("Search updated successfully!");
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update search");
    },
  });

  // Mutation for deleting a saved search
  const deleteMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: (response) => {
      if (response.status === "success") {
        queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_QUERY_KEY });
        toast.success("Search deleted successfully!");
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete search");
    },
  });

  // Mutation for duplicating a saved search
  const duplicateMutation = useMutation({
    mutationFn: duplicateSavedSearch,
    onSuccess: (response) => {
      if (response.status === "success") {
        queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_QUERY_KEY });
        toast.success("Search duplicated successfully!");
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to duplicate search");
    },
  });

  return {
    // Data
    savedSearches,
    isLoading,
    isError,
    error,

    // Actions
    refetch,
    createSavedSearch: (data: SavedSearchData) => createMutation.mutate(data),
    updateSavedSearch: (id: string, data: Partial<SavedSearchData>) =>
      updateMutation.mutate({ id, data }),
    deleteSavedSearch: (id: string) => deleteMutation.mutate(id),
    duplicateSavedSearch: (id: string) => duplicateMutation.mutate(id),

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}

/**
 * Hook for getting a single saved search by ID
 */
export function useSavedSearch(id: string | null) {
  return useQuery({
    queryKey: ["savedSearch", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await getSavedSearch(id);
      if (response.status === "error") {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!id,
    retry: false,
  });
}

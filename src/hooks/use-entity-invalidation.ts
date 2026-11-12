import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Entity screens cache aggressively (lists stay fresh for a day), so every
 * mutation must mark the cached entity data stale or the change stays
 * invisible until a manual refresh.
 */
const ENTITY_QUERY_KEYS = [
  "entities",
  "entity",
  "entityHierarchy",
  "entityAudio",
  "slokamDetails",
  "slokamSiblings",
  "queryEntitiesByIDs",
  "queryEntityParent",
  "devotional",
];

export function useInvalidateEntities() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all(
        ENTITY_QUERY_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
    [queryClient],
  );
}

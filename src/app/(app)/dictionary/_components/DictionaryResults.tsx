/**
 * DictionaryResults - Legacy Export
 * 
 * Task: T088 (Completed), T89 (view mode support)
 * This file now delegates to the Container/Presentation pattern
 * Maintains backward compatibility while using the new architecture
 */

"use client";

import { DictionaryResultsContainer } from "./DictionaryResultsContainer";
import { ViewMode } from "../types";

interface DictionaryResultsProps {
  asBrowse?: boolean;
  viewMode?: ViewMode;
}

/**
 * T088: Remove direct useQuery calls from DictionaryResults component
 * All logic moved to Container, all rendering moved to List
 * T89: Added view mode support
 */
export function DictionaryResults({ asBrowse, viewMode }: DictionaryResultsProps) {
  return <DictionaryResultsContainer asBrowse={asBrowse} viewMode={viewMode} />;
}

export default DictionaryResults;

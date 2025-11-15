/**
 * DictionaryResults - Legacy Export
 * 
 * Task: T088 (Completed)
 * This file now delegates to the Container/Presentation pattern
 * Maintains backward compatibility while using the new architecture
 */

"use client";

import { DictionaryResultsContainer } from "./DictionaryResultsContainer";

interface DictionaryResultsProps {
  asBrowse?: boolean;
}

/**
 * T088: Remove direct useQuery calls from DictionaryResults component
 * All logic moved to Container, all rendering moved to List
 */
export function DictionaryResults({ asBrowse }: DictionaryResultsProps) {
  return <DictionaryResultsContainer asBrowse={asBrowse} />;
}

export default DictionaryResults;

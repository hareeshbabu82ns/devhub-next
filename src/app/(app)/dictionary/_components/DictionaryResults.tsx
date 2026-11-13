"use client";

import { DictionaryResultsContainer } from "./DictionaryResultsContainer";
import { ViewMode } from "../types";
import { DictionaryUrlStateApi } from "./use-dictionary-url-state";

interface DictionaryResultsProps {
  state: DictionaryUrlStateApi;
  asBrowse?: boolean;
  viewMode?: ViewMode;
  onCompare?: (word: string) => void;
}

export function DictionaryResults(props: DictionaryResultsProps) {
  return <DictionaryResultsContainer {...props} />;
}

export default DictionaryResults;

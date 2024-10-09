"use client";

import DictionaryResults from "./DictionaryResults";
import { SearchToolBar } from "./search-toolbar";

// import DictionaryItemList from "./DictionaryResults";

interface DictionaryViewProps {
  asBrowse?: boolean;
}
const DictionaryView = ({ asBrowse }: DictionaryViewProps) => {
  return (
    <main className="flex flex-1 flex-col gap-4 min-h-[calc(100vh_-_theme(spacing.20))]">
      <SearchToolBar asBrowse={asBrowse} />
      <DictionaryResults asBrowse={asBrowse} />
    </main>
  );
};

export default DictionaryView;

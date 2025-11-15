"use client";

import { useState } from "react";
import DictionaryResults from "./DictionaryResults";
import { SearchToolBar } from "./search-toolbar";
import DictionaryFilters from "./DictionaryFilters";

// import DictionaryItemList from "./DictionaryResults";

interface DictionaryViewProps {
  asBrowse?: boolean;
}

/**
 * T80: Integrated filter sidebar with toggle functionality
 */
const DictionaryView = ({ asBrowse }: DictionaryViewProps) => {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <main className="flex flex-1 flex-col gap-4 min-h-[calc(100vh_-_theme(spacing.20))]">
      <SearchToolBar 
        asBrowse={asBrowse} 
        onFilterToggle={() => setFilterOpen(true)}
      />
      <DictionaryResults asBrowse={asBrowse} />
      
      {/* T74-T86: Advanced Filter Sidebar */}
      <DictionaryFilters 
        open={filterOpen}
        onOpenChange={setFilterOpen}
      />
    </main>
  );
};

export default DictionaryView;

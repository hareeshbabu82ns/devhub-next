"use client";

import { useState } from "react";
import DictionaryResults from "./DictionaryResults";
import { SearchToolBar } from "./search-toolbar";
import DictionaryFilters from "./DictionaryFilters";
import DictionaryViewModeSelector from "./DictionaryViewModeSelector";
import { ViewMode } from "../types";

// import DictionaryItemList from "./DictionaryResults";

interface DictionaryViewProps {
  asBrowse?: boolean;
}

/**
 * T80: Integrated filter sidebar with toggle functionality
 * T87-T94: Integrated view mode selector with state management
 */
const DictionaryView = ({ asBrowse }: DictionaryViewProps) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  return (
    <main className="flex flex-1 flex-col gap-4 min-h-[calc(100vh_-_theme(spacing.20))]">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <SearchToolBar 
            asBrowse={asBrowse} 
            onFilterToggle={() => setFilterOpen(true)}
          />
        </div>
        
        {/* T87: View Mode Selector */}
        <DictionaryViewModeSelector 
          value={viewMode}
          onChange={setViewMode}
        />
      </div>
      
      <DictionaryResults asBrowse={asBrowse} viewMode={viewMode} />
      
      {/* T74-T86: Advanced Filter Sidebar */}
      <DictionaryFilters 
        open={filterOpen}
        onOpenChange={setFilterOpen}
      />
    </main>
  );
};

export default DictionaryView;

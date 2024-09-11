"use client";

import DictionaryResults from "./_components/DictionaryResults";
import { SearchToolBar } from "./_components/search-toolbar";

// import DictionaryItemList from "./DictionaryResults";

interface DictionaryPageProps {
  asBrowse?: boolean;
}
const DictionaryPage = ({ asBrowse }: DictionaryPageProps) => {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <SearchToolBar asBrowse={asBrowse} />
      <DictionaryResults asBrowse={asBrowse} />
    </main>
  );
};

export default DictionaryPage;
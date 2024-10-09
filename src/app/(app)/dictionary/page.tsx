import DictionaryResults from "./_components/DictionaryResults";
import DictionaryView from "./_components/DictionaryView";
import { SearchToolBar } from "./_components/search-toolbar";

// import DictionaryItemList from "./DictionaryResults";

interface DictionaryPageProps {
}
const DictionaryPage = (props: DictionaryPageProps) => {
  return (
    <DictionaryView asBrowse/>
  );
};

export default DictionaryPage;

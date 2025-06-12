import BookmarkedEntitiesGrid from "./_components/BookmarkedEntitiesGrid";
import PanchangamInfo from "./_components/PanchangamInfo";
import DevotionalQuickAccess from "./_components/DevotionalQuickAccess";

const Page = () => {
  return (
    <div className="flex-1 flex flex-col gap-4">
      <PanchangamInfo />
      <DevotionalQuickAccess />
      <BookmarkedEntitiesGrid />
    </div>
  );
};

export default Page;

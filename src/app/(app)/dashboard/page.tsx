import BookmarkedEntitiesGrid from "./_components/BookmarkedEntitiesGrid";
import PanchangamInfo from "./_components/PanchangamInfo";

const Page = () => {
  return (
    <div className="flex flex-col gap-4">
      <PanchangamInfo />
      <BookmarkedEntitiesGrid />
    </div>
  );
};

export default Page;

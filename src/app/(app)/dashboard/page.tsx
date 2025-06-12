import PanchangamInfo from "./_components/PanchangamInfo";
import DevotionalQuickAccess from "./_components/DevotionalQuickAccess";

const Page = () => {
  return (
    <div className="flex-1 flex flex-col gap-4">
      <PanchangamInfo />
      <DevotionalQuickAccess className="flex-1" />
    </div>
  );
};

export default Page;

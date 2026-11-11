import { Suspense } from "react";
import UniverseView from "@/components/features/universe/UniverseView";

export const metadata = { title: "Universe" };

export default function UniversePage() {
  return (
    <Suspense>
      <UniverseView />
    </Suspense>
  );
}

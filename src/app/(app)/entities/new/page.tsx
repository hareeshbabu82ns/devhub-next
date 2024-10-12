"use client";

import { EntityTypeEnum } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import EntityEdit from "../_components/EnityEdit";

const EntityNewPage = () => {
  const searchParams = useSearchParams();
  const entityType = searchParams.get("type") as EntityTypeEnum;

  return (
    <div className="min-h-[calc(100vh_-_theme(spacing.20))] w-full flex">
      <EntityEdit />
    </div>
  );
};

export default EntityNewPage;

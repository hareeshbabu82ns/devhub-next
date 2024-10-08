"use client";

import { EntityTypeEnum } from "@/lib/types";
import EntityBulkCreator from "../_components/EntityBulkCreator";
import { useSearchParams } from "next/navigation";

const EntityNewPage = () => {
  const searchParams = useSearchParams();
  const entityType = searchParams.get("type") as EntityTypeEnum;

  return (
    <div className="min-h-[calc(100vh_-_theme(spacing.20))] w-full flex">
      <EntityBulkCreator entityType={entityType} />
    </div>
  );
};

export default EntityNewPage;

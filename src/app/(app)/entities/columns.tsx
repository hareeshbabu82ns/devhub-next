import { EntityWithRelations } from "@/lib/types";
import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper<EntityWithRelations>();
export const columns = [
  columnHelper.accessor("id", {
    id: "id",
    header: "ID",
  }),
  columnHelper.accessor("type", {
    id: "type",
    header: "Type",
    meta: {
      // fieldType: "array",
      filterVariant: "multiSelect",
    },
  }),
  columnHelper.accessor("text", {
    id: "text",
    header: "Text",
  }),
  columnHelper.accessor("parents", {
    id: "parents",
    header: "Parents",
    meta: {
      fieldType: "array",
      filterVariant: "multiSelect",
    },
  }),
];

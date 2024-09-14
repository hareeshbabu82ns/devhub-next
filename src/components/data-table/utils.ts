import { ColumnDef, ColumnFilter, SortingState } from "@tanstack/react-table";
import { Option } from "../ui/multi-select";

export const filterFnMultiSelect = (
  row: any,
  columnId: string,
  filterValue: any,
) => {
  const arrVal = filterValue as Option[];
  const value = row.original[columnId] as string;
  if (arrVal.length && !arrVal.some((v) => v.value === value)) return false;
  return true;
};

export const filterFnDateRange = (
  row: any,
  columnId: string,
  filterValue: any,
) => {
  const arrVal = filterValue as [string, string];
  const value = row.original[columnId] as Date;
  if (arrVal[0] && value < new Date(arrVal[0])) return false;
  if (arrVal[1] && value > new Date(arrVal[1])) return false;
  return true;
};

export const convertSortingToPrisma = (
  sorting: SortingState,
  columns: ColumnDef<any, any>[],
) => {
  // sorting [ { id: 'date', desc: true } ] to { date: 'desc' }

  return sorting.reduce((acc, { id, desc }) => {
    const column = columns.find((c) => c.id === id);
    const dbId = column?.meta?.dbMapId || id;

    if (
      column?.meta?.fieldType === "subObject" &&
      column?.meta?.subObjectLabelField
    ) {
      acc[id] = {
        [column?.meta?.subObjectLabelField]: desc ? "desc" : "asc",
      };
    } else {
      acc[dbId] = desc ? "desc" : "asc";
    }
    return acc;
  }, {} as any);
};

export const convertColumnFiltersToPrisma = (
  filters: ColumnFilter[],
  columns: ColumnDef<any, any>[],
) => {
  // filters [ { id: 'description', value: 'des*' } ] to { description: { contains: 'des' } }

  // console.dir({ columns }, { depth: 3 });
  return filters?.reduce((acc, { id, value }) => {
    const column = columns.find((c) => c.id === id);
    const dbId = column?.meta?.dbMapId || id;
    switch (column?.meta?.filterVariant) {
      case "dateRange": {
        acc[dbId] = {};
        const arrVal = value as [string, string];
        if (arrVal[0]) acc[dbId] = { ...acc[dbId], gte: new Date(arrVal[0]) };
        if (arrVal[1]) acc[dbId] = { ...acc[dbId], lte: new Date(arrVal[1]) };
        break;
      }
      case "range": {
        acc[dbId] = {};
        const arrVal = value as [string, string];
        if (arrVal[0]) acc[dbId] = { ...acc[dbId], gte: Number(arrVal[0]) };
        if (arrVal[1]) acc[dbId] = { ...acc[dbId], lte: Number(arrVal[1]) };
        break;
      }
      case "select": {
        acc[dbId] = { equals: value };
        break;
      }
      case "multiSelect": {
        switch (column?.meta.fieldType) {
          case "array":
            const values = (value as Option[]).map((o) => o.value);
            if (!values.length) break;
            acc[dbId] = { hasSome: values };
            break;
          case "subObject":
            const valuesObj = value as Record<string, any>;
            acc[dbId] = { some: valuesObj };
            break;
          default:
            const valuesStr = value as string[];
            if (!valuesStr.length) break;
            acc[dbId] = { in: valuesStr };
            break;
        }
        // acc[dbId] =
        //   column?.meta.fieldType === "array"
        //     ? { hasSome: values }
        //     : { in: values };
        break;
      }
      case "text": {
        acc[dbId] = { contains: value, mode: "insensitive" };
        break;
      }
      default: {
        acc[dbId] = { contains: value, mode: "insensitive" };
        break;
      }
    }
    return acc;
  }, {} as any);
};

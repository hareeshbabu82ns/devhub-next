import {
  RowEditInstance,
  RowEditOptions,
  RowEditRow,
  RowEditTableState,
} from "@/components/data-table/datatable-feature-row-editing";
import { Option } from "@/components/ui/multi-select";
import { RowData } from "@tanstack/react-table";
import { ComponentType } from "react";

export interface PageMeta {
  title: string;
  description: string;
  cardImage: string;
}

export interface IRoute {
  path: string;
  name: string;
  layout?: string;
  exact?: boolean;
  component?: ComponentType;
  disabled?: boolean;
  icon?: JSX.Element;
  secondary?: boolean;
  collapse?: boolean;
  items?: IRoute[];
  rightElement?: boolean;
  invisible?: boolean;
}

declare global {
  var Paddle: any;
}

declare module "@tanstack/react-table" {
  interface TableState extends RowEditTableState { }

  interface TableOptionsResolved<TData extends RowData>
    extends RowEditOptions<TData> { }

  interface Table<TData extends RowData> extends RowEditInstance<TData> { }

  interface Row<TData extends RowData> extends RowEditRow { }

  interface TableMeta<TData extends RowData> {
    deleteData?: ( data: { rowId: string; rowData?: TData } ) => void;
    updateData?: ( data: { rowId: string; rowData: TData } ) => void;
    updateCellData?: ( data: {
      rowId: string;
      rowData: TData;
      columnId: string;
      value: unknown;
    } ) => void;
  }

  //allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    cellInputVariant?:
    | "text"
    | "textArea"
    | "number"
    | "switch"
    | "checkbox"
    | "select"
    | "multiSelect"
    | "date"
    | "dateRange"
    | "skeleton";
    filterVariant?:
    | "text"
    | "range"
    | "select"
    | "multiSelect"
    | "date"
    | "dateRange";
    filterOptions?: Option[];
    filterOptionsFn?: () => Promise<Option[] | undefined>;
    dbMapId?: string;
    fieldType?: "array" | "subObject";
    subObjectLabelField?: string;
  }
}

export type UploadFileType =
  | "application/pdf"
  | "application/json"
  | "text/csv"
  | "text/plain"
  | "image/png"
  | "image/jpeg"
  | "image/jpg"
  | "audio/mpeg"
  | "audio/mp3"
  | "audio/wav"
  | "video"
  | "audio"
  | "all";

export interface FileUploadProps {
  allowedTypes?: UploadFileType[];
  disabled?: boolean;
  showPreviews?: boolean;
  label?: string;
  loading?: boolean;
  basePath?: string;
  onChangeFiles?: ( files: File[] ) => void;
  onUploadSuccess?: ( urls: string[] ) => Promise<void>;
}

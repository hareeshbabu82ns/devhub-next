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

export type UploadFileType =
  | "application/pdf"
  | "application/json"
  | "text/csv"
  | "text/plain"
  | "image/png"
  | "image/jpeg"
  | "image/jpg"
  | "video"
  | "audio"
  | "all";
export interface FileUploadProps {
  allowedTypes?: UploadFileType[];
  disabled?: boolean;
  showPreviews?: boolean;
  label?: string;
  loading?: boolean;
  onChangeFiles?: (files: File[]) => void;
  onUploadSuccess?: (urls: string[]) => Promise<void>;
}

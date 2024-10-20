import { EntityTypeEnum } from "@/lib/types";

export interface TileModel {
  id: string;
  title: string;
  type: EntityTypeEnum;
  subTitle?: string;
  src: string;
  audio?: string;
  order?: number;
  bookmarked?: boolean;
  childrenCount?: number;
  parentId?: string;
  parentTitle?: string;
}

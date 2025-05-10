import { Prisma } from "@/app/generated/prisma";
import { LANGUAGE_SCHEME_MAP } from "../constants";
import Sanscript from "@indic-transliteration/sanscript";

export const defaultEntityCreateInput: Prisma.EntityCreateInput = {
  order: 0,
  type: "STHOTRAM",
  imageThumbnail: "/default-om_256.png",
  // parentsRel:
  //   {
  //     connect:{
  //       id:""
  //     }
  //   },
  text: [
    // {
    //   language: "ENG",
    //   value: "",
    // },
    {
      language: "TEL",
      value: "",
    },
    {
      language: "SAN",
      value: "$transliterateFrom=TEL",
    },
  ],
  // attributes: [
  //   {
  //     key: "source",
  //     value: "",
  //   },
  // ],
};

export const defaultEntityUpdateInput: Prisma.EntityUpdateInput = {
  order: 0,
  type: "GOD",
  imageThumbnail: "/default-om_256.png",
  text: [
    {
      language: "ENG",
      value: "",
    },
    {
      language: "TEL",
      value: "",
    },
    {
      language: "SAN",
      value: "$transliterateFrom=TEL",
    },
  ],
  attributes: [
    {
      key: "source",
      value: "",
    },
  ],
};

import { z } from "zod";
import { ENTITY_TYPES, LANGUAGES } from "../constants";
import { DICTIONARY_ORIGINS } from "@/app/(app)/dictionary/utils";

// based on DictItemInput
export const DictItemFormSchema = z.object( {
  origin: z.enum( DICTIONARY_ORIGINS ),
  wordIndex: z.number(),
  word: z
    .array(
      z.object( {
        language: z.enum( LANGUAGES ),
        value: z.string(),
      } )
    )
    .min( 1 ),
  description: z
    .array(
      z.object( {
        language: z.enum( LANGUAGES ),
        value: z.string(),
      } )
    )
    .min( 1 ),
  attributes: z
    .array(
      z.object( {
        key: z.string(),
        value: z.string(),
      } )
    )
    .optional(),
  phonetic: z.string().optional().default( "" ),
} );

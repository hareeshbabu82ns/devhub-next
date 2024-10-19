import { LANGUAGE_MEANING_SELECT_KEY, LANGUAGE_SELECT_DEFAULT, LANGUAGE_SELECT_KEY, QUERY_RESULT_LIMIT_DEFAULT, QUERY_RESULT_LIMIT_KEY, TEXT_SIZE_SELECT_DEFAULT, TEXT_SIZE_SELECT_KEY } from "@/lib/constants";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

type LocalConfig = {
  pageSize: number;
};

const configAtom = atomWithStorage<LocalConfig>( "config", {
  pageSize: 20,
} );

export function useLocalConfig() {
  return useAtom( configAtom );
}

export const queryLimitAtom = atomWithStorage<string>( QUERY_RESULT_LIMIT_KEY, QUERY_RESULT_LIMIT_DEFAULT );

export const textSizeAtom = atomWithStorage<string>( TEXT_SIZE_SELECT_KEY, TEXT_SIZE_SELECT_DEFAULT );

export const languageAtom = atomWithStorage<string>( LANGUAGE_SELECT_KEY, LANGUAGE_SELECT_DEFAULT );
export const languageMeaningAtom = atomWithStorage<string>( LANGUAGE_MEANING_SELECT_KEY, LANGUAGE_SELECT_DEFAULT );

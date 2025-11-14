import {
  LANGUAGE_FONT_FAMILY,
  LANGUAGE_MEANING_SELECT_KEY,
  LANGUAGE_SELECT_DEFAULT,
  LANGUAGE_SELECT_KEY,
  PANCHANGAM_PLACE_SELECT_DEFAULT,
  PANCHANGAM_PLACE_SELECT_KEY,
  PANCHANGAM_TIMELINE_VIEW_DEFAULT,
  PANCHANGAM_TIMELINE_VIEW_KEY,
  PanchangamTimelineViewMode,
  QUERY_RESULT_LIMIT_DEFAULT,
  QUERY_RESULT_LIMIT_KEY,
  TEXT_SIZE_SELECT_DEFAULT,
  TEXT_SIZE_SELECT_KEY,
} from "@/lib/constants";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useLocalStorage } from "./use-hydration-safe-storage";

type LocalConfig = {
  pageSize: number;
};

const configAtom = atomWithStorage<LocalConfig>("config", {
  pageSize: 20,
});

export function useLocalConfig() {
  return useAtom(configAtom);
}

export const queryLimitAtom = atomWithStorage<string>(
  QUERY_RESULT_LIMIT_KEY,
  QUERY_RESULT_LIMIT_DEFAULT,
);
export function useQueryLimitAtom() {
  return useAtom(queryLimitAtom);
}
export function useQueryLimitAtomValue() {
  return useAtomValue(queryLimitAtom);
}

export const textSizeAtom = atomWithStorage<string>(
  TEXT_SIZE_SELECT_KEY,
  TEXT_SIZE_SELECT_DEFAULT,
);
export function useTextSizeAtom() {
  return useAtom(textSizeAtom);
}
export function useTextSizeAtomValue() {
  return useAtomValue(textSizeAtom);
}

export const languageAtom = atomWithStorage<string>(
  LANGUAGE_SELECT_KEY,
  LANGUAGE_SELECT_DEFAULT,
);
export function useLanguageAtom() {
  return useAtom(languageAtom);
}
export function useLanguageAtomValue() {
  return useAtomValue(languageAtom);
}
export function useLanguageFontAtomValue() {
  const language = useLanguageAtomValue();
  return (
    LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY] ||
    undefined
  );
}
export const languageMeaningAtom = atomWithStorage<string>(
  LANGUAGE_MEANING_SELECT_KEY,
  LANGUAGE_SELECT_DEFAULT,
);
export function useMeaningLanguageAtom() {
  return useAtom(languageMeaningAtom);
}
export function useMeaningLanguageAtomValue() {
  return useAtomValue(languageMeaningAtom);
}

export const panchangamPlaceAtom = atomWithStorage<string>(
  PANCHANGAM_PLACE_SELECT_KEY,
  PANCHANGAM_PLACE_SELECT_DEFAULT,
);
export function usePanchangamPlaceAtom() {
  return useAtom(panchangamPlaceAtom);
}
export function usePanchangamPlaceAtomValue() {
  return useAtomValue(panchangamPlaceAtom);
}

export const panchangamTimelineViewAtom =
  atomWithStorage<PanchangamTimelineViewMode>(
    PANCHANGAM_TIMELINE_VIEW_KEY,
    PANCHANGAM_TIMELINE_VIEW_DEFAULT,
  );
export function usePanchangamTimelineViewAtom() {
  return useAtom(panchangamTimelineViewAtom);
}
export function usePanchangamTimelineViewAtomValue() {
  return useAtomValue(panchangamTimelineViewAtom);
}

export function useSidebarMinimized() {
  return useLocalStorage<boolean>("sidebar-minimized", false);
}

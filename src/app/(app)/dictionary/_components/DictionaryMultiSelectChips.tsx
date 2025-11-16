"use client";
// ref: https://shadcnui-expansions.typeart.cc/docs/multiple-selector
// ref: https://craft.mxkaske.dev/post/fancy-multi-select
import { useLocalStorage } from "usehooks-ts";
import { DICTIONARY_ORIGINS_DDLB } from "../utils";
import MultiSelectChips from "@/components/inputs/MultiSelectChips";
import { FormSelectOptions } from "@/components/inputs/FormSelect";
import { useState } from "react";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useDictionaryFilters } from "@/hooks/use-dictionary-filters";

export const DICTIONARY_ORIGINS_SELECT_KEY = "dictionary-origins";

const DictionariesMultiSelectChips = () => {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const { filters } = useDictionaryFilters();

  const [localOrigins, setLocalOrigins] = useLocalStorage<string[]>(
    DICTIONARY_ORIGINS_SELECT_KEY,
    [],
  );

  const originParam = (
    searchParams.get("origins")?.split(",") ??
    localOrigins ??
    []
  )
    .map((o) => DICTIONARY_ORIGINS_DDLB.find((d) => d.value === o))
    .filter((o) => !!o) as FormSelectOptions[];

  const [origins, setOrigins] = useState<FormSelectOptions[]>(originParam);

  const setLocalOriginsAndParams = (value: FormSelectOptions[]) => {
    setOrigins(value);
    const originsChg = value.map((v) => v.value);
    setLocalOrigins(originsChg);
    updateSearchParams({
      origins: originsChg.join(","),
      offset: "0",
    });
  };

  return (
    <div className="w-full px-10">
      <MultiSelectChips
        value={origins}
        onChange={setLocalOriginsAndParams}
        defaultOptions={DICTIONARY_ORIGINS_DDLB}
        placeholder="Select frameworks you like..."
        emptyIndicator={
          <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
            no results found.
          </p>
        }
      />
    </div>
  );
};

export default DictionariesMultiSelectChips;

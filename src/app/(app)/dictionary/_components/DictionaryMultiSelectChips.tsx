"use client";
// ref: https://shadcnui-expansions.typeart.cc/docs/multiple-selector
// ref: https://craft.mxkaske.dev/post/fancy-multi-select
import { useLocalStorage } from "usehooks-ts";
import { DICTIONARY_ORIGINS_DDLB } from "../utils";
import MultiSelectChips from "@/components/inputs/MultiSelectChips";
import { FormSelectOptions } from "@/components/inputs/FormSelect";
// import { updateSearchParams } from "@/lib/utils";
import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const DICTIONARY_ORIGINS_SELECT_KEY = "dictionary-origins";

const DictionariesMultiSelectChips = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localOrigins, setLocalOrigins] = useLocalStorage<string[]>(
    DICTIONARY_ORIGINS_SELECT_KEY,
    [],
  );

  const createQueryString = useCallback(
    (newParams: Record<string, string>, replace: boolean = false) => {
      const params = new URLSearchParams(
        replace ? "" : searchParams.toString(),
      );
      for (const [key, value] of Object.entries(newParams)) {
        params.set(key, value);
      }
      return params.toString();
    },
    [searchParams],
  );

  const originParam = (
    searchParams.get("origin")?.split(",") ??
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
    const newSearchString = createQueryString(
      {
        origin: originsChg.join(","),
      },
      true,
    );
    router.push(`${pathname}?${newSearchString}`);
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

"use client";

import { ITRANS_DRAVIDIAN_HELP } from "@/components/sanscript/transliterate_consts";
import {
  getSchemeOption,
  safeTransliterate,
} from "@/lib/sanscript/transliteration";

interface SanscriptHelpProps {
  language: string;
}

type HelpGroup = { label: string; values: Record<string, string> };

/**
 * Key map for a language. Sanskrit and Telugu have hand written tables; any
 * other script gets the Sanskrit table with its letters converted, and codes
 * without a script (None, roman schemes) fall back to Sanskrit.
 */
const getHelpGroups = (language: string): HelpGroup[] => {
  const own = ITRANS_DRAVIDIAN_HELP[language];
  if (own) return own;

  const base = ITRANS_DRAVIDIAN_HELP.SAN;
  const option = getSchemeOption(language);
  if (!option || option.kind !== "brahmic") return base;

  return base.map((group) => ({
    label: group.label,
    values: Object.fromEntries(
      Object.entries(group.values).map(([letter, keys]) => [
        safeTransliterate(letter, "devanagari", option.scheme),
        keys,
      ]),
    ),
  }));
};

const SanscriptHelp = ({ language }: SanscriptHelpProps) => {
  const itransHelp = getHelpGroups(language);

  return (
    <div className="flex border rounded-sm p-2 flex-col gap-4">
      {itransHelp.map((itransKey) => (
        <div key={itransKey.label} className="p-2 flex flex-col gap-2">
          <div>{itransKey.label}</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.keys(itransKey.values).map((v, idx) => (
              <div
                key={`${idx}-${v}`}
                className="border rounded-xl p-1 px-3 flex gap-4 hover:bg-muted/50 justify-center"
              >
                <p className="text-md">{v}</p>
                <p className="text-muted-foreground">{itransKey.values[v]}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SanscriptHelp;

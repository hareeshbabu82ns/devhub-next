"use client";

import { ITRANS_DRAVIDIAN_HELP } from "./transliterate_consts";

interface SanscriptHelpProps {
  language: string;
}

const SanscriptHelp = ({ language }: SanscriptHelpProps) => {
  const itransHelp = ITRANS_DRAVIDIAN_HELP[language];

  return (
    <div className="flex border rounded-sm p-2 flex-col gap-4">
      {itransHelp.map((itransKey) => (
        <div key={itransKey.label} className="p-2 flex flex-col gap-2">
          <div>{itransKey.label}</div>
          <div className="grid grid-cols-5 gap-2">
            {Object.keys(itransKey.values).map((v, idx) => (
              <div
                key={`${idx}-${v}`}
                className="border rounded-xl p-1 px-3 flex gap-4 hover:bg-muted/50 w-18 md:w-24 justify-center"
              >
                <p className="text-md">{v}</p>
                <p className="text-muted-foreground">{itransKey.values[v]}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* <pre>{JSON.stringify(itransHelp, null, 2)}</pre> */}
    </div>
  );
};

export default SanscriptHelp;

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES_DDLB } from "@/lib/constants";
import {
  LANGUAGE_SANSCRIPT_DDLB,
  LANGUAGE_TO_TRANSLITERATION_DDLB,
} from "./utils";
import { Textarea } from "@/components/ui/textarea";
import WebIMEIde from "./WebIMEIde";
import { useState } from "react";
import Sanscript from "@indic-transliteration/sanscript";
import { useLanguageAtomValue, useTextSizeAtomValue } from "@/hooks/use-config";
import { cn } from "@/lib/utils";

type SanscriptConvertorState = {
  fromScheme: string;
  toScheme: string;
  fromText: string;
  toText: string;
};

const SanscriptConvertor = () => {
  const textSize = useTextSizeAtomValue();
  const language = useLanguageAtomValue();

  const [state, setState] = useState<SanscriptConvertorState>({
    fromScheme: "ITRANS",
    toScheme: "TEL",
    fromText: "",
    toText: "",
  });

  const setFormState = (newState: Partial<SanscriptConvertorState>) => {
    setState((state) => {
      const computedState = { ...state };
      if (newState.fromText && newState.fromText !== state.fromText) {
        computedState.fromText = newState.fromText;
        computedState.toText = Sanscript.t(
          newState.fromText,
          LANGUAGE_SANSCRIPT_DDLB[computedState.fromScheme].scheme,
          LANGUAGE_SANSCRIPT_DDLB[computedState.toScheme].scheme,
        );
      } else if (newState.fromText === "") {
        computedState.fromText = "";
        computedState.toText = "";
      }

      if (newState.toText && newState.toText !== state.toText) {
        computedState.toText = newState.toText;
        computedState.fromText = Sanscript.t(
          newState.toText,
          LANGUAGE_SANSCRIPT_DDLB[computedState.toScheme].scheme,
          LANGUAGE_SANSCRIPT_DDLB[computedState.fromScheme].scheme,
        );
      } else if (newState.toText === "") {
        computedState.fromText = "";
        computedState.toText = "";
      }

      if (newState.fromScheme && newState.fromScheme !== state.fromScheme) {
        computedState.fromScheme = newState.fromScheme;
        if (LANGUAGE_SANSCRIPT_DDLB[computedState.fromScheme]) {
          computedState.fromText = Sanscript.t(
            state.toText,
            LANGUAGE_SANSCRIPT_DDLB[computedState.toScheme].scheme,
            LANGUAGE_SANSCRIPT_DDLB[computedState.fromScheme].scheme,
          );
        }
      }

      if (newState.toScheme && newState.toScheme !== state.toScheme) {
        computedState.toScheme = newState.toScheme;
        if (LANGUAGE_SANSCRIPT_DDLB[computedState.toScheme]) {
          computedState.toText = Sanscript.t(
            state.fromText,
            LANGUAGE_SANSCRIPT_DDLB[computedState.fromScheme].scheme,
            LANGUAGE_SANSCRIPT_DDLB[computedState.toScheme].scheme,
          );
        }
      }

      return computedState;
    });
  };

  return (
    <div className="flex flex-col gap-4 flex-grow p-1">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50} minSize={5} className="pr-2">
          <div className="flex h-full flex-col gap-4">
            <Select
              value={state.fromScheme}
              onValueChange={(v) => setFormState({ fromScheme: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Input Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES_DDLB.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div
              className={`flex flex-1 overflow-y-auto subpixel-antialiased text-${textSize} leading-loose tracking-widest`}
            >
              {Object.keys(LANGUAGE_TO_TRANSLITERATION_DDLB).indexOf(
                state.fromScheme,
              ) < 0 ? (
                <Textarea
                  key={`textarea-${state.fromScheme}`}
                  className={cn(
                    ["TEL", "SAN", "IAST", "SLP1", "ITRANS"].includes(
                      language,
                    ) && "font-shobhika",
                  )}
                  value={state.fromText}
                  onChange={(e) => setFormState({ fromText: e.target.value })}
                />
              ) : (
                <WebIMEIde
                  key={`web-ime-${state.fromScheme}`}
                  language={state.fromScheme}
                  value={state.fromText}
                  onChange={(e) => setFormState({ fromText: e.target.value })}
                  showHelpIcon
                />
              )}
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={5} className="pl-2">
          <div className="flex h-full flex-col gap-4">
            <Select
              value={state.toScheme}
              onValueChange={(v) => setFormState({ toScheme: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Input Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES_DDLB.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div
              className={`flex flex-1 overflow-y-auto subpixel-antialiased text-${textSize} leading-loose tracking-widest`}
            >
              {Object.keys(LANGUAGE_TO_TRANSLITERATION_DDLB).indexOf(
                state.toScheme,
              ) < 0 ? (
                <Textarea
                  key={`textarea-${state.toScheme}`}
                  value={state.toText}
                  onChange={(e) => setFormState({ toText: e.target.value })}
                />
              ) : (
                <WebIMEIde
                  key={`web-ime-${state.toScheme}`}
                  language={state.toScheme}
                  value={state.toText}
                  onChange={(e) => setFormState({ toText: e.target.value })}
                  showHelpIcon
                />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SanscriptConvertor;

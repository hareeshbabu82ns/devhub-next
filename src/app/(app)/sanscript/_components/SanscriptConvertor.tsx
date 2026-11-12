"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRightIcon,
  CheckIcon,
  CopyIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SanscriptHelpTrigger from "@/components/sanscript/SanscriptHelpTrigger";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  changeScheme,
  ConverterSide,
  ConverterState,
  editSide,
  swapSides,
} from "@/lib/sanscript/converter-state";
import {
  CONVERTER_SCHEMES,
  getSchemeOption,
} from "@/lib/sanscript/transliteration";
import WebIMEIde from "./WebIMEIde";

const STORAGE_KEY = "sanscript:convertor";

type ConvertorSettings = {
  from: string;
  to: string;
  autoDetect: boolean;
  convertOnSwitch: boolean;
};

const DEFAULT_SETTINGS: ConvertorSettings = {
  from: "ITRANS",
  to: "TEL",
  autoDetect: true,
  convertOnSwitch: true,
};

const SCHEME_GROUPS = [
  {
    label: "Scripts",
    schemes: CONVERTER_SCHEMES.filter((s) => s.kind === "brahmic"),
  },
  {
    label: "Romanisations",
    schemes: CONVERTER_SCHEMES.filter((s) => s.kind === "roman"),
  },
];

const loadSettings = (): ConvertorSettings => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const settings = { ...DEFAULT_SETTINGS, ...stored };
    // ignore schemes that no longer exist, or a broken pair
    if (
      !getSchemeOption(settings.from) ||
      !getSchemeOption(settings.to) ||
      settings.from === settings.to
    ) {
      return { ...settings, from: DEFAULT_SETTINGS.from, to: DEFAULT_SETTINGS.to };
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

interface PaneProps {
  side: ConverterSide;
  title: string;
  scheme: string;
  text: string;
  onSchemeChange: (scheme: string) => void;
  onTextChange: (text: string) => void;
}

const ConvertorPane = ({
  side,
  title,
  scheme,
  text,
  onSchemeChange,
  onTextChange,
}: PaneProps) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const option = getSchemeOption(scheme);
  const isScript = option?.kind === "brahmic";

  return (
    <section className="flex min-h-0 flex-col gap-2" aria-label={title}>
      <div className="flex items-center gap-1">
        <Select value={scheme} onValueChange={onSchemeChange}>
          <SelectTrigger className="min-w-0 flex-1" aria-label={`${title} scheme`}>
            <SelectValue placeholder="Select scheme" />
          </SelectTrigger>
          <SelectContent>
            {SCHEME_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.schemes.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {/* key map for typing phonetically into a script pane */}
        {isScript && <SanscriptHelpTrigger language={scheme} />}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          title={`Copy ${option?.label ?? ""} text`}
          disabled={!text}
          onClick={() => copyToClipboard(text)}
        >
          {isCopied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <WebIMEIde
          id={`convertor-${side}`}
          // script panes get the phonetic IME, roman panes are typed as is
          language={isScript ? scheme : "NONE"}
          value={text}
          onValueChange={onTextChange}
          className="min-h-32"
          placeholder={
            isScript
              ? `Paste ${option?.label} text, or type phonetically (rAmaH)…`
              : `Type or paste ${option?.label ?? ""} text…`
          }
        />
      </div>
      {option?.lossy && (
        <p className="text-xs text-muted-foreground">
          {option.label} cannot write every Sanskrit sound, so converting back
          from it is approximate.
        </p>
      )}
    </section>
  );
};

const SanscriptConvertor = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [state, setState] = useState<ConverterState>({
    from: DEFAULT_SETTINGS.from,
    to: DEFAULT_SETTINGS.to,
    fromText: "",
    toText: "",
    active: "from",
  });

  // Restore the last used schemes and options after hydration
  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);
    setState((s) => ({ ...s, from: stored.from, to: stored.to }));
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...settings, from: state.from, to: state.to }),
      );
    } catch {
      // storage unavailable: nothing to remember
    }
  }, [settings, state.from, state.to, settingsLoaded]);

  const pane = (side: ConverterSide, title: string) => (
    <ConvertorPane
      side={side}
      title={title}
      scheme={state[side]}
      text={side === "from" ? state.fromText : state.toText}
      onSchemeChange={(scheme) =>
        setState((s) =>
          changeScheme(s, side, scheme, {
            convertOnSwitch: settings.convertOnSwitch,
          }),
        )
      }
      onTextChange={(text) =>
        setState((s) =>
          editSide(s, side, text, { autoDetect: settings.autoDetect }),
        )
      }
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setState(swapSides)}
          title="Swap the two sides"
        >
          <ArrowLeftRightIcon className="size-4" />
          Swap
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!state.fromText && !state.toText}
          onClick={() =>
            setState((s) => ({ ...s, fromText: "", toText: "" }))
          }
        >
          <Trash2Icon className="size-4" />
          Clear
        </Button>
        <div
          className="flex items-center gap-2"
          title="Switch a side to the script of the text pasted into it"
        >
          <Switch
            id="convertor-auto-detect"
            checked={settings.autoDetect}
            onCheckedChange={(autoDetect) =>
              setSettings((s) => ({ ...s, autoDetect }))
            }
          />
          <Label htmlFor="convertor-auto-detect">Detect script</Label>
        </div>
        <div
          className="flex items-center gap-2"
          title="On: picking another scheme rewrites that side in it. Off: the text stays and is re-read as the new scheme."
        >
          <Switch
            id="convertor-convert-on-switch"
            checked={settings.convertOnSwitch}
            onCheckedChange={(convertOnSwitch) =>
              setSettings((s) => ({ ...s, convertOnSwitch }))
            }
          />
          <Label htmlFor="convertor-convert-on-switch">
            Rewrite on scheme change
          </Label>
        </div>
      </div>
      {/* stacked on phones, side by side from tablet width */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1">
        {pane("from", "First side")}
        {pane("to", "Second side")}
      </div>
    </div>
  );
};

export default SanscriptConvertor;

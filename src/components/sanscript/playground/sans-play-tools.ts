import {
  AudioLinesIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  LanguagesIcon,
  MergeIcon,
  ScissorsIcon,
  SplitIcon,
  TagIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";
import { TransliterationScheme } from "@/types/sanscript";

export type PlayTool = {
  key: string;
  title: string;
  icon: LucideIcon;
  /** Which of the node's schemes follow the script of the text it is given */
  schemes: "both" | "output" | "none";
};

/** One entry per capability of the sanscript-utils service */
export const TOOLS: PlayTool[] = [
  { key: "textInput", title: "Text", icon: TypeIcon, schemes: "none" },
  { key: "parser", title: "Sentence Parser", icon: BrainCircuitIcon, schemes: "both" },
  { key: "splitter", title: "Sandhi Splitter", icon: SplitIcon, schemes: "both" },
  { key: "joiner", title: "Sandhi Joiner", icon: MergeIcon, schemes: "both" },
  { key: "wordTagger", title: "Word Tagger", icon: TagIcon, schemes: "both" },
  { key: "segmenter", title: "Word Segmenter", icon: ScissorsIcon, schemes: "both" },
  { key: "transliterate", title: "Transliterate", icon: LanguagesIcon, schemes: "output" },
  { key: "phoneticSearch", title: "Phonetic Search", icon: AudioLinesIcon, schemes: "output" },
  { key: "dictionary", title: "Dictionary", icon: BookOpenIcon, schemes: "both" },
];

/** Scheme fields for a tool added from the toolbar, in the app's language */
export function toolbarSchemes(tool: PlayTool, scheme: TransliterationScheme) {
  if (tool.schemes === "both") return { schemeFrom: scheme, schemeTo: scheme };
  if (tool.schemes === "output") return { schemeTo: scheme };
  return {};
}

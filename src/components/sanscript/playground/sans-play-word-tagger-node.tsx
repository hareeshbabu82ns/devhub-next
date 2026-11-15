"use client";

import React, { useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { TagIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguageTags } from "@/hooks/use-sanskrit-utils";
import {
  SANSCRIPT_LEXICON_LABELS,
  SANSCRIPT_LEXICONS,
  SanscriptLexicon,
  TransliterationScheme,
} from "@/types/sanscript";
import { buildItemResults } from "./results";
import {
  NodeCheckbox,
  STRICT_HINT,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayWordTaggerData = SansPlayToolData & {
  strictIO: boolean;
  /** Where the word forms are looked up */
  lexicon: SanscriptLexicon;
};

export const defaultWordTaggerNodeData: SansPlayWordTaggerData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  strictIO: false,
  lexicon: "COMBINED",
};

function SansPlayWordTaggerNode({
  id,
  data,
}: NodeProps<Node<SansPlayWordTaggerData>>) {
  const { updateNodeData } = useReactFlow();
  const { getTags, isLoading, error } = useLanguageTags();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    clearResults();
    setEmpty(false);
    getTags(data, {
      onSuccess: (tags) => {
        setEmpty(tags.length === 0);
        // several words can be tagged at once: say which one a reading is of
        const severalForms = new Set(tags.map((tag) => tag.form)).size > 1;
        showResults(
          buildItemResults(
            id,
            tags.map((tag, index) => ({
              label: tag.word,
              subTitle: severalForms ? tag.form : undefined,
              tags: tag.tags,
              index: tags.length > 1 ? index + 1 : undefined,
            })),
            data.schemeTo,
          ),
        );
      },
    });
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Word Tagger"
      icon={<TagIcon />}
      text={data.text}
      placeholder="word or words to analyse..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "The lexicon does not know this word" : null}
      onRun={onRun}
      onClear={clearResults}
      inputLimit={1}
    >
      <SchemePair id={id} data={data} />
      <div className="flex items-center gap-3">
        <Select
          value={data.lexicon ?? "COMBINED"}
          onValueChange={(lexicon) => updateNodeData(id, { lexicon })}
        >
          <SelectTrigger className="nodrag min-w-0 flex-1" aria-label="Lexicon">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SANSCRIPT_LEXICONS.map((lexicon) => (
              <SelectItem key={lexicon} value={lexicon}>
                {SANSCRIPT_LEXICON_LABELS[lexicon]} lexicon
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <NodeCheckbox
          id={id}
          field="strictIO"
          checked={!!data.strictIO}
          label="Strict"
          title={STRICT_HINT}
        />
      </div>
    </SansPlayToolNode>
  );
}

export default SansPlayWordTaggerNode;

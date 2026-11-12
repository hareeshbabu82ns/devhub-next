"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Markdown from "react-markdown";
import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  useLanguageTags,
  usePhoneticWordSearch,
  usePreSegmentedSplits,
  useSandhiJoins,
  useSandhiSplits,
  useSanscriptDictionaryBrowse,
  useSanscriptDictionarySearch,
  useSanscriptUtilsVersion,
  useSentenceParse,
  useServiceTransliterate,
} from "@/hooks/use-sanskrit-utils";
import {
  SANSCRIPT_DICTIONARIES,
  SanscriptDictionary,
  SanscriptDictionaryResults,
  TRANSLITERATION_SCHEME_LABELS,
  TRANSLITERATION_SCHEMES,
  TransliterationScheme,
} from "@/types/sanscript";
import MindMapGraph from "../mindmap/mind-map-graph";
import SanscriptPlayGraph from "./playground/sans-play-graph";
import { splitWordsToJoin } from "./playground/sans-play-joiner-node";

const TABS = [
  { value: "playground", label: "Playground" },
  { value: "splits", label: "Sandhi Splits" },
  { value: "joins", label: "Sandhi Joins" },
  { value: "tags", label: "Word Tags" },
  { value: "parse", label: "Sentence Parse" },
  { value: "segment", label: "Segment" },
  { value: "transliterate", label: "Transliterate" },
  { value: "phonetic", label: "Phonetic Search" },
  { value: "dictionary", label: "Dictionary" },
  { value: "mindmap", label: "MindMap" },
];

export default function SanscriptUtils() {
  const [activeTab, setActiveTab] = useState("playground");
  const service = useSanscriptUtilsVersion();

  return (
    <div className="flex-1 flex flex-col gap-4 flex-grow p-1 min-w-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        {/* one scrollable row: ten tabs do not fit a phone as a grid */}
        <div className="mb-4 overflow-x-auto">
          <TabsList className="inline-flex w-max">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {service.isError && (
          <p className="mb-4 text-sm text-destructive">
            The Sanskrit utils service is not reachable, so these tools will
            fail. Check SANSCRIPT_UTILS_URL and that the service is running.
          </p>
        )}

        <TabsContent value="playground">
          <SanscriptPlayGraph />
        </TabsContent>
        <TabsContent value="splits">
          <SandhiSplitsTab />
        </TabsContent>
        <TabsContent value="joins">
          <SandhiJoinsTab />
        </TabsContent>
        <TabsContent value="tags">
          <LanguageTagsTab />
        </TabsContent>
        <TabsContent value="parse">
          <SentenceParseTab />
        </TabsContent>
        <TabsContent value="segment">
          <SegmentTab />
        </TabsContent>
        <TabsContent value="transliterate">
          <TransliterateTab />
        </TabsContent>
        <TabsContent value="phonetic">
          <PhoneticSearchTab />
        </TabsContent>
        <TabsContent value="dictionary">
          <DictionaryTab />
        </TabsContent>
        <TabsContent value="mindmap" className="flex-1 flex">
          <MindMapGraph />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* Shared building blocks -------------------------------------------------- */

function ToolCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SchemeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: TransliterationScheme;
  onChange: (scheme: TransliterationScheme) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as TransliterationScheme)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select scheme" />
        </SelectTrigger>
        <SelectContent>
          {TRANSLITERATION_SCHEMES.map((scheme) => (
            <SelectItem key={scheme} value={scheme}>
              {TRANSLITERATION_SCHEME_LABELS[scheme]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Input and output scheme, with their state */
function useSchemes(
  from = TransliterationScheme.IAST,
  to = TransliterationScheme.IAST,
) {
  const [schemeFrom, setSchemeFrom] = useState(from);
  const [schemeTo, setSchemeTo] = useState(to);
  return { schemeFrom, setSchemeFrom, schemeTo, setSchemeTo };
}

function SchemeFields({
  id,
  schemes,
  fromLabel = "Input scheme",
  toLabel = "Output scheme",
}: {
  id: string;
  schemes: ReturnType<typeof useSchemes>;
  fromLabel?: string;
  toLabel?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SchemeField
        id={`${id}-from`}
        label={fromLabel}
        value={schemes.schemeFrom}
        onChange={schemes.setSchemeFrom}
      />
      <SchemeField
        id={`${id}-to`}
        label={toLabel}
        value={schemes.schemeTo}
        onChange={schemes.setSchemeTo}
      />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        required
      />
    </div>
  );
}

function LimitField({
  id,
  value,
  onChange,
  max = 10,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Result limit</Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(1, Number(e.target.value) || 1)))
        }
      />
    </div>
  );
}

function CheckField({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2" title={hint}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(!!value)}
      />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

const STRICT_HINT =
  "Strict input / output handling: rejects text the parser cannot read exactly";

function SubmitRow({
  isLoading,
  label,
  error,
}: {
  isLoading: boolean;
  label: string;
  error: Error | null;
}) {
  return (
    <>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Processing..." : label}
      </Button>
      {error && (
        <div className="text-sm text-destructive break-words">
          {error.message}
        </div>
      )}
    </>
  );
}

/** A result line that can be copied with one tap */
function ResultLine({ children, text }: { children: ReactNode; text: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(text)}
      title="Copy"
      className="w-full rounded-md bg-muted p-3 text-left hover:bg-muted/70"
    >
      {children}
      {isCopied && (
        <span className="ml-2 text-xs text-muted-foreground">copied</span>
      )}
    </button>
  );
}

function Results({
  show,
  empty,
  children,
}: {
  /** a request has completed */
  show: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Results</h3>
      {empty ? (
        <p className="text-sm text-muted-foreground">Nothing found.</p>
      ) : (
        children
      )}
    </div>
  );
}

/* Tabs --------------------------------------------------------------------- */

function SandhiSplitsTab() {
  const [text, setText] = useState("");
  const schemes = useSchemes(TransliterationScheme.DEVANAGARI);
  const [limit, setLimit] = useState(2);
  const [strictIO, setStrictIO] = useState(false);
  const mutation = useSandhiSplits();
  const [done, setDone] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    mutation.split(
      {
        text,
        schemeFrom: schemes.schemeFrom,
        schemeTo: schemes.schemeTo,
        limit,
        strictIO,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <ToolCard
      title="Sandhi Splits"
      description="Break joined Sanskrit text into the words it is made of."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="splits-text"
          label="Sanskrit text"
          value={text}
          onChange={setText}
          placeholder="तपःस्वाध्यायनिरतं"
        />
        <SchemeFields id="splits" schemes={schemes} />
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
          <LimitField id="splits-limit" value={limit} onChange={setLimit} />
          <CheckField
            id="splits-strict"
            label="Strict"
            checked={strictIO}
            onChange={setStrictIO}
            hint={STRICT_HINT}
          />
        </div>
        <SubmitRow
          isLoading={mutation.isLoading}
          label="Split"
          error={mutation.error}
        />
      </form>
      <Results show={done} empty={mutation.splits.length === 0}>
        {mutation.splits.map((split, index) => (
          <ResultLine key={index} text={split.join(" ")}>
            {split.join(" + ")}
          </ResultLine>
        ))}
      </Results>
    </ToolCard>
  );
}

function SandhiJoinsTab() {
  const [text, setText] = useState("");
  const schemes = useSchemes();
  const [strictIO, setStrictIO] = useState(false);
  const mutation = useSandhiJoins();
  const [done, setDone] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const words = splitWordsToJoin(text);
    if (words.length === 0) return;
    setDone(false);
    mutation.join(
      {
        words,
        schemeFrom: schemes.schemeFrom,
        schemeTo: schemes.schemeTo,
        strictIO,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <ToolCard
      title="Sandhi Joins"
      description="Join words the way sandhi rules combine them."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="joins-words"
          label="Words (separated by commas or spaces)"
          value={text}
          onChange={setText}
          placeholder="tapaḥ, svādhyāya, niratam"
        />
        <SchemeFields id="joins" schemes={schemes} />
        <CheckField
          id="joins-strict"
          label="Strict"
          checked={strictIO}
          onChange={setStrictIO}
          hint={STRICT_HINT}
        />
        <SubmitRow
          isLoading={mutation.isLoading}
          label="Join"
          error={mutation.error}
        />
      </form>
      <Results show={done} empty={mutation.joins.length === 0}>
        {mutation.joins.map((joined, index) => (
          <ResultLine key={index} text={joined}>
            {joined}
          </ResultLine>
        ))}
      </Results>
    </ToolCard>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function LanguageTagsTab() {
  const [text, setText] = useState("");
  const schemes = useSchemes();
  const [strictIO, setStrictIO] = useState(false);
  const mutation = useLanguageTags();
  const [done, setDone] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    mutation.getTags(
      {
        text,
        schemeFrom: schemes.schemeFrom,
        schemeTo: schemes.schemeTo,
        strictIO,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <ToolCard
      title="Word Tags"
      description="Every grammatical reading of a single inflected word."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="tags-text"
          label="Sanskrit word"
          value={text}
          onChange={setText}
          placeholder="niratam"
        />
        <SchemeFields id="tags" schemes={schemes} />
        <CheckField
          id="tags-strict"
          label="Strict"
          checked={strictIO}
          onChange={setStrictIO}
          hint={STRICT_HINT}
        />
        <SubmitRow
          isLoading={mutation.isLoading}
          label="Get tags"
          error={mutation.error}
        />
      </form>
      <Results show={done} empty={mutation.tags.length === 0}>
        {mutation.tags.map((tag, index) => (
          <div key={index} className="space-y-2 rounded-md bg-muted p-3">
            <div className="font-medium">{tag.word}</div>
            <TagList tags={tag.tags} />
          </div>
        ))}
      </Results>
    </ToolCard>
  );
}

function DiagramLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens the diagram on image-charts.com (the sentence is part of the link)"
      className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
    >
      {children}
      <ExternalLinkIcon className="size-3" />
    </a>
  );
}

function SentenceParseTab() {
  const [text, setText] = useState("");
  const schemes = useSchemes();
  const [limit, setLimit] = useState(2);
  const [preSegmented, setPreSegmented] = useState(false);
  const [strictIO, setStrictIO] = useState(false);
  const mutation = useSentenceParse();
  const [done, setDone] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    mutation.parse(
      {
        text,
        schemeFrom: schemes.schemeFrom,
        schemeTo: schemes.schemeTo,
        limit,
        preSegmented,
        strictIO,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  const results = mutation.parseResults;
  const hasAnalysis = results.some((r) =>
    r.analysis?.some((a) => a?.graph?.length),
  );

  return (
    <ToolCard
      title="Sentence Parse"
      description="Split a sentence and work out how its words relate to each other."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="parse-text"
          label="Sanskrit sentence"
          value={text}
          onChange={setText}
          placeholder="vāgvidāṃ varam"
        />
        <SchemeFields id="parse" schemes={schemes} />
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          <LimitField id="parse-limit" value={limit} onChange={setLimit} />
          <CheckField
            id="parse-presegmented"
            label="Already segmented"
            checked={preSegmented}
            onChange={setPreSegmented}
            hint="The words are already split and separated by spaces"
          />
          <CheckField
            id="parse-strict"
            label="Strict"
            checked={strictIO}
            onChange={setStrictIO}
            hint={STRICT_HINT}
          />
        </div>
        <SubmitRow
          isLoading={mutation.isLoading}
          label="Parse sentence"
          error={mutation.error}
        />
      </form>
      <Results show={done} empty={!hasAnalysis}>
        {results.map((result, resultIndex) => (
          <div key={resultIndex} className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h4 className="font-medium">Split {resultIndex + 1}</h4>
              {result.splitDotURL && (
                <DiagramLink href={result.splitDotURL}>
                  Split diagram
                </DiagramLink>
              )}
            </div>
            {result.analysis?.map(
              (analysis, analysisIndex) =>
                analysis?.graph?.length > 0 && (
                  <div
                    key={analysisIndex}
                    className="space-y-2 rounded-md bg-muted p-3"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <h5 className="font-medium">
                        Parse {analysisIndex + 1}
                      </h5>
                      {result.parseDotURLs?.[analysisIndex] && (
                        <DiagramLink href={result.parseDotURLs[analysisIndex]}>
                          Diagram
                        </DiagramLink>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {analysis.graph.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="space-y-1 rounded-md border bg-background p-3"
                        >
                          <div className="font-medium">
                            {item.node.pada}
                            {item.node.root && (
                              <span className="ml-2 font-normal text-muted-foreground">
                                √ {item.node.root}
                              </span>
                            )}
                          </div>
                          <TagList tags={item.node.tags} />
                          {item.predecessor && (
                            <div className="text-sm text-muted-foreground">
                              {item.relation || "related"} →{" "}
                              {item.predecessor.pada}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        ))}
      </Results>
    </ToolCard>
  );
}

function SegmentTab() {
  const [text, setText] = useState("");
  const schemes = useSchemes(TransliterationScheme.DEVANAGARI);
  const [strictIO, setStrictIO] = useState(false);
  const mutation = usePreSegmentedSplits();
  const [done, setDone] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    mutation.segment(
      {
        text,
        schemeFrom: schemes.schemeFrom,
        schemeTo: schemes.schemeTo,
        strictIO,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <ToolCard
      title="Segment"
      description="For a sentence whose words are already separated by spaces: returns each word in its standalone form."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="segment-text"
          label="Words separated by spaces"
          value={text}
          onChange={setText}
          placeholder="देवदत्तः ग्रामं गच्छति"
        />
        <SchemeFields id="segment" schemes={schemes} />
        <CheckField
          id="segment-strict"
          label="Strict"
          checked={strictIO}
          onChange={setStrictIO}
          hint={STRICT_HINT}
        />
        <SubmitRow
          isLoading={mutation.isLoading}
          label="Segment"
          error={mutation.error}
        />
      </form>
      <Results show={done} empty={mutation.segments.length === 0}>
        <ResultLine text={mutation.segments.join(" ")}>
          {mutation.segments.join(" · ")}
        </ResultLine>
      </Results>
    </ToolCard>
  );
}

function TransliterateTab() {
  const [text, setText] = useState("");
  const schemes = useSchemes(
    TransliterationScheme.IAST,
    TransliterationScheme.DEVANAGARI,
  );
  const mutation = useServiceTransliterate();
  const [done, setDone] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    mutation.transliterate(
      { text, schemeFrom: schemes.schemeFrom, schemeTo: schemes.schemeTo },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <ToolCard
      title="Transliterate"
      description="Transliteration by the service itself, the same one its other tools use. For everyday conversion the Convertor tab is faster and knows more schemes."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="transliterate-text"
          label="Text"
          value={text}
          onChange={setText}
          placeholder="vāgvidāṃ varam"
        />
        <SchemeFields id="transliterate" schemes={schemes} />
        <SubmitRow
          isLoading={mutation.isLoading}
          label="Transliterate"
          error={mutation.error}
        />
      </form>
      <Results show={done} empty={!mutation.result}>
        <ResultLine text={mutation.result ?? ""}>{mutation.result}</ResultLine>
      </Results>
    </ToolCard>
  );
}

const PAGE_SIZE = 10;

function Pager({
  page,
  total,
  shown,
  isLoading,
  onPage,
}: {
  page: number;
  total: number;
  shown: number;
  isLoading: boolean;
  onPage: (page: number) => void;
}) {
  const first = page * PAGE_SIZE + 1;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>
        {first}–{first + shown - 1} of {total}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page === 0 || isLoading}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={first + shown - 1 >= total || isLoading}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function PhoneticSearchTab() {
  const [text, setText] = useState("");
  const schemes = useSchemes(TransliterationScheme.ITRANS);
  const [startsWith, setStartsWith] = useState(true);
  const [endsWith, setEndsWith] = useState(false);
  const [page, setPage] = useState(0);
  const mutation = usePhoneticWordSearch();

  const run = (nextPage: number) => {
    setPage(nextPage);
    mutation.search({
      search: text.trim(),
      searchScheme: schemes.schemeFrom,
      outputScheme: schemes.schemeTo,
      startsWith,
      endsWith,
      limit: PAGE_SIZE,
      offset: nextPage * PAGE_SIZE,
    });
  };

  const data = mutation.data;

  return (
    <ToolCard
      title="Phonetic Search"
      description="Find words by how they sound: no diacritics or exact spelling needed."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(0);
        }}
        className="space-y-4"
      >
        <TextField
          id="phonetic-text"
          label="Word as it sounds"
          value={text}
          onChange={setText}
          placeholder="rama"
        />
        <SchemeFields
          id="phonetic"
          schemes={schemes}
          fromLabel="Search scheme"
        />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <CheckField
            id="phonetic-starts"
            label="Starts with"
            checked={startsWith}
            onChange={setStartsWith}
          />
          <CheckField
            id="phonetic-ends"
            label="Ends with"
            checked={endsWith}
            onChange={setEndsWith}
          />
        </div>
        <SubmitRow
          isLoading={mutation.isLoading}
          label="Search"
          error={mutation.error}
        />
      </form>
      <Results show={!!data} empty={!data?.results.length}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data?.results.map((item) => (
            <ResultLine key={item.key} text={item.word}>
              <span className="font-medium">{item.word}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {item.key}
              </span>
            </ResultLine>
          ))}
        </div>
        <Pager
          page={page}
          total={data?.total ?? 0}
          shown={data?.results.length ?? 0}
          isLoading={mutation.isLoading}
          onPage={run}
        />
      </Results>
    </ToolCard>
  );
}

const ALL_DICTIONARIES = "ALL";

function DictionaryTab() {
  const [mode, setMode] = useState<"search" | "browse">("search");
  const [text, setText] = useState("");
  const schemes = useSchemes();
  const [origin, setOrigin] = useState<string>(ALL_DICTIONARIES);
  const [searchOnlyKeys, setSearchOnlyKeys] = useState(true);
  const [startsWith, setStartsWith] = useState(true);
  const [endsWith, setEndsWith] = useState(false);
  const [fuzzySearch, setFuzzySearch] = useState(false);
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<SanscriptDictionaryResults | null>(null);

  const searchMutation = useSanscriptDictionarySearch();
  const browseMutation = useSanscriptDictionaryBrowse();
  const isLoading = searchMutation.isLoading || browseMutation.isLoading;
  const error = mode === "search" ? searchMutation.error : browseMutation.error;
  const browseNeedsDictionary = mode === "browse" && origin === ALL_DICTIONARIES;

  const run = (nextPage: number) => {
    setPage(nextPage);
    const paging = { limit: PAGE_SIZE, offset: nextPage * PAGE_SIZE };
    const callbacks = { onSuccess: setData };
    if (mode === "browse") {
      if (origin === ALL_DICTIONARIES) return;
      browseMutation.browse(
        {
          origin: origin as SanscriptDictionary,
          outputScheme: schemes.schemeTo,
          ...paging,
        },
        callbacks,
      );
    } else {
      searchMutation.search(
        {
          search: text.trim(),
          searchScheme: schemes.schemeFrom,
          outputScheme: schemes.schemeTo,
          origin:
            origin === ALL_DICTIONARIES
              ? undefined
              : [origin as SanscriptDictionary],
          searchOnlyKeys,
          startsWith,
          endsWith,
          fuzzySearch,
          caseInsensitive,
          ...paging,
        },
        callbacks,
      );
    }
  };

  const switchMode = (next: string) => {
    setMode(next as "search" | "browse");
    setData(null);
    setPage(0);
  };

  return (
    <ToolCard
      title="Dictionary"
      description="Look words up in the dictionaries held by the Sanskrit utils service, or page through one of them."
    >
      <Tabs value={mode} onValueChange={switchMode}>
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="browse">Browse</TabsTrigger>
        </TabsList>
      </Tabs>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(0);
        }}
        className="space-y-4"
      >
        {mode === "search" && (
          <TextField
            id="dictionary-text"
            label="Word"
            value={text}
            onChange={setText}
            placeholder="rāma"
          />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mode === "search" && (
            <SchemeField
              id="dictionary-from"
              label="Search scheme"
              value={schemes.schemeFrom}
              onChange={schemes.setSchemeFrom}
            />
          )}
          <SchemeField
            id="dictionary-to"
            label="Output scheme"
            value={schemes.schemeTo}
            onChange={schemes.setSchemeTo}
          />
          <div className="grid gap-2">
            <Label htmlFor="dictionary-origin">Dictionary</Label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger id="dictionary-origin" className="w-full">
                <SelectValue placeholder="Dictionary" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {mode === "search" && (
                  <SelectItem value={ALL_DICTIONARIES}>
                    All dictionaries
                  </SelectItem>
                )}
                {SANSCRIPT_DICTIONARIES.map((dictionary) => (
                  <SelectItem key={dictionary} value={dictionary}>
                    {dictionary}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {mode === "search" && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <CheckField
              id="dictionary-keys"
              label="Headwords only"
              checked={searchOnlyKeys}
              onChange={setSearchOnlyKeys}
              hint="Off: also search inside the descriptions"
            />
            <CheckField
              id="dictionary-starts"
              label="Starts with"
              checked={startsWith}
              onChange={setStartsWith}
            />
            <CheckField
              id="dictionary-ends"
              label="Ends with"
              checked={endsWith}
              onChange={setEndsWith}
            />
            <CheckField
              id="dictionary-fuzzy"
              label="Fuzzy"
              checked={fuzzySearch}
              onChange={setFuzzySearch}
            />
            <CheckField
              id="dictionary-case"
              label="Ignore case"
              checked={caseInsensitive}
              onChange={setCaseInsensitive}
            />
          </div>
        )}
        {browseNeedsDictionary && (
          <p className="text-sm text-muted-foreground">
            Pick a dictionary to browse.
          </p>
        )}
        <Button type="submit" disabled={isLoading || browseNeedsDictionary}>
          {isLoading ? "Processing..." : mode === "search" ? "Search" : "Browse"}
        </Button>
        {error && (
          <div className="text-sm text-destructive break-words">
            {error.message}
          </div>
        )}
      </form>
      <Results show={!!data} empty={!data?.results.length}>
        {data?.results.map((item) => (
          <article key={item.id} className="space-y-2 rounded-md bg-muted p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.key}</span>
              <Badge variant="outline">{item.origin}</Badge>
            </div>
            {item.description && (
              <div className="markdown-content max-h-60 overflow-y-auto text-sm">
                <Markdown>{item.description}</Markdown>
              </div>
            )}
          </article>
        ))}
        <Pager
          page={page}
          total={data?.total ?? 0}
          shown={data?.results.length ?? 0}
          isLoading={isLoading}
          onPage={run}
        />
      </Results>
    </ToolCard>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  useSandhiSplits,
  useSandhiJoins,
  useLanguageTags,
  useSentenceParse,
} from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import MindMapGraph from "../mindmap/mind-map-graph";
import SanscriptPlayGraph from "./playground/sans-play-graph";

export default function SanscriptUtils() {
  const [activeTab, setActiveTab] = useState("playground");

  return (
    <div className="flex-1 flex flex-col gap-4 flex-grow p-1">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid grid-cols-6 mb-6">
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="splits">Sandhi Splits</TabsTrigger>
          <TabsTrigger value="joins">Sandhi Joins</TabsTrigger>
          <TabsTrigger value="tags">Language Tags</TabsTrigger>
          <TabsTrigger value="parse">Sentence Parse</TabsTrigger>
          <TabsTrigger value="mindmap">MindMap</TabsTrigger>
        </TabsList>

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

        <TabsContent value="parse" className="flex-1 flex">
          <SentenceParseTab />
        </TabsContent>

        <TabsContent value="mindmap" className="flex-1 flex">
          <MindMapGraph />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SandhiSplitsTab() {
  const [text, setText] = useState("");
  const [schemeFrom, setSchemeFrom] = useState<TransliterationScheme>(
    TransliterationScheme.DEVANAGARI,
  );
  const [schemeTo, setSchemeTo] = useState<TransliterationScheme>(
    TransliterationScheme.IAST,
  );
  const [limit, setLimit] = useState(2);

  const { split, splits, isLoading, error } = useSandhiSplits();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    split({ text, schemeFrom, schemeTo, limit });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sandhi Splits</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="text">Sanskrit Text</Label>
            <Input
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter Sanskrit text to split"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="schemeFrom">From Scheme</Label>
              <Select
                value={schemeFrom}
                onValueChange={(val) =>
                  setSchemeFrom(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schemeTo">To Scheme</Label>
              <Select
                value={schemeTo}
                onValueChange={(val) =>
                  setSchemeTo(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="limit">Result Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  min="1"
                  max="10"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : "Split"}
          </Button>

          {error && (
            <div className="text-destructive mt-2">{error.message}</div>
          )}

          {splits.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Results:</h3>
              <div className="space-y-2">
                {splits.map((splitResult, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    {splitResult.join(" ")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function SandhiJoinsTab() {
  const [wordInput, setWordInput] = useState("");
  const [schemeFrom, setSchemeFrom] = useState<TransliterationScheme>(
    TransliterationScheme.IAST,
  );
  const [schemeTo, setSchemeTo] = useState<TransliterationScheme>(
    TransliterationScheme.TELUGU,
  );

  const { join, joins, isLoading, error } = useSandhiJoins();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const words = wordInput
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);

    if (words.length > 0) {
      join({ words, schemeFrom, schemeTo });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sandhi Joins</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="words">Sanskrit Words (comma-separated)</Label>
            <Input
              id="words"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Enter comma-separated Sanskrit words"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="schemeFrom">From Scheme</Label>
              <Select
                value={schemeFrom}
                onValueChange={(val) =>
                  setSchemeFrom(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schemeTo">To Scheme</Label>
              <Select
                value={schemeTo}
                onValueChange={(val) =>
                  setSchemeTo(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : "Join"}
          </Button>

          {error && (
            <div className="text-destructive mt-2">{error.message}</div>
          )}

          {joins.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Results:</h3>
              <div className="space-y-2">
                {joins.map((joinedText, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    {joinedText}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function LanguageTagsTab() {
  const [text, setText] = useState("");
  const [schemeFrom, setSchemeFrom] = useState<TransliterationScheme>(
    TransliterationScheme.IAST,
  );
  const [schemeTo, setSchemeTo] = useState<TransliterationScheme>(
    TransliterationScheme.TELUGU,
  );

  const { getTags, tags, isLoading, error } = useLanguageTags();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    getTags({ text, schemeFrom, schemeTo });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language Tags</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="text">Sanskrit Word</Label>
            <Input
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter a Sanskrit word to analyze"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="schemeFrom">From Scheme</Label>
              <Select
                value={schemeFrom}
                onValueChange={(val) =>
                  setSchemeFrom(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schemeTo">To Scheme</Label>
              <Select
                value={schemeTo}
                onValueChange={(val) =>
                  setSchemeTo(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : "Get Tags"}
          </Button>

          {error && (
            <div className="text-destructive mt-2">{error.message}</div>
          )}

          {tags.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Results:</h3>
              <div className="space-y-4">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted rounded-md space-y-2"
                  >
                    <div className="font-medium">Word: {tag.word}</div>
                    <div>
                      <span className="font-medium">Tags:</span>{" "}
                      {tag.tags.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function SentenceParseTab() {
  // Example from documentation: "vāgvidāṃ varam"
  const [text, setText] = useState("");
  const [schemeFrom, setSchemeFrom] = useState<TransliterationScheme>(
    TransliterationScheme.IAST,
  );
  const [schemeTo, setSchemeTo] = useState<TransliterationScheme>(
    TransliterationScheme.TELUGU,
  );
  const [limit, setLimit] = useState(2);
  const [preSegmented, setPreSegmented] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  const { parse, parseResults, isLoading, error } = useSentenceParse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    parse({ text, schemeFrom, schemeTo, limit, preSegmented });
    // Reset to first result when submitting a new query
    setSelectedResultIndex(0);
  };

  // Auto-submit the example when component mounts
  useEffect(() => {
    if (text && parseResults.length === 0) {
      parse({ text, schemeFrom, schemeTo, limit, preSegmented });
    }
  }, [
    parse,
    text,
    schemeFrom,
    schemeTo,
    limit,
    preSegmented,
    parseResults.length,
  ]);

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Sentence Parse</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="text">Sanskrit Sentence</Label>
            <Input
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter a Sanskrit sentence to parse"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="schemeFrom">From Scheme</Label>
              <Select
                value={schemeFrom}
                onValueChange={(val) =>
                  setSchemeFrom(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schemeTo">To Scheme</Label>
              <Select
                value={schemeTo}
                onValueChange={(val) =>
                  setSchemeTo(val as TransliterationScheme)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="limit">Result Limit</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="10"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="preSegmented"
                checked={preSegmented}
                onCheckedChange={(checked) => setPreSegmented(!!checked)}
              />
              <Label htmlFor="preSegmented">Pre-segmented</Label>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : "Parse Sentence"}
          </Button>

          {error && (
            <div className="text-destructive mt-2">{error.message}</div>
          )}
        </form>
        {parseResults.length > 0 && (
          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Results:</h3>
            </div>

            {parseResults.length > 1 && (
              <div className="mb-4">
                <Label className="mb-1 block">Select Analysis:</Label>
                <Select
                  value={selectedResultIndex.toString()}
                  onValueChange={(value) =>
                    setSelectedResultIndex(parseInt(value))
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Select analysis" />
                  </SelectTrigger>
                  <SelectContent>
                    {parseResults.map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Analysis {index + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-6">
              {parseResults.map(
                (parseResult, resultIndex) =>
                  resultIndex === selectedResultIndex && (
                    <div key={resultIndex} className="space-y-4">
                      <h4 className="font-medium">
                        Analysis {resultIndex + 1}
                      </h4>
                      {parseResult.analysis.map((analysis, analysisIndex) => (
                        <div
                          key={`analysis-${resultIndex}-${analysisIndex}`}
                          className="bg-muted p-4 rounded-md"
                        >
                          <h5 className="font-medium mb-2">
                            Graph {analysisIndex + 1}
                          </h5>
                          <div className="grid gap-2">
                            {analysis.graph.map((graph, graphIndex) => (
                              <div
                                key={`graph-${resultIndex}-${analysisIndex}-${graphIndex}`}
                                className="border p-3 rounded-md"
                              >
                                <div>
                                  <span className="font-medium">Word:</span>{" "}
                                  {graph.node.pada}
                                </div>
                                <div>
                                  <span className="font-medium">Root:</span>{" "}
                                  {graph.node.root}
                                </div>
                                <div>
                                  <span className="font-medium">Tags:</span>{" "}
                                  {graph.node.tags.join(", ")}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Predecessor:
                                  </span>{" "}
                                  {graph.predecessor
                                    ? graph.predecessor.pada
                                    : ""}
                                </div>
                                <div>
                                  <span className="font-medium">Relation:</span>{" "}
                                  {graph.relation ? graph.relation : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

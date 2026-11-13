/**
 * DictionaryResultCard - Presentation Component
 * Renders a single dictionary entry with modern grid styling
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";
import { SearchResultHighlight } from "./SearchResultHighlight";
import { AudioPlayer } from "@/components/features/dictionary/AudioPlayer";
import { DictionaryItem, ViewMode } from "../types";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";

const MATCH_LABEL: Record<string, string> = {
    exact: "Exact",
    prefix: "Starts with",
    contains: "Contains",
    meaning: "In meaning",
    fuzzy: "Similar",
    phonetic: "Sounds like",
};
import {
    getRelevanceLabel,
    getRelevanceCategory
} from "@/lib/dictionary/relevance-scoring";

interface DictionaryResultCardProps {
    item: Partial<DictionaryItem>;
    language: string;
    textSize: string;
    isTouchDevice: boolean;
    asBrowse?: boolean;
    searchTerm?: string;
    viewMode?: ViewMode;
    onCopyDescription: (description: string) => void;
    onEditItem: (itemId: string) => void;
    onCompare?: (word: string) => void;
    /** Highlight this card (jumped-to entry) */
    focused?: boolean;
    showMatchType?: boolean;
}

export function DictionaryResultCard({
    item,
    language,
    textSize,
    isTouchDevice,
    asBrowse,
    searchTerm,
    viewMode = "card",
    onCopyDescription,
    onEditItem,
    onCompare,
    focused = false,
    showMatchType = true,
}: DictionaryResultCardProps) {
    const dictInfo = getDictionaryInfo(item.origin ?? "");
    const entryHref = `/dictionary/${item.id}`;
    const [isExpanded, setIsExpanded] = useState(false);

    // Audio check
    const audioUrl = (item as any).audio || item.sourceData?.audioUrl || item.sourceData?.audio;
    const hasAudio = Boolean(audioUrl);

    // Relevance scores
    const hasRelevanceScore = typeof item.relevanceScore === "number";
    const relevanceScore = item.relevanceScore ?? 0;

    // Truncation logic
    const shouldTruncate = (viewMode === "compact" || viewMode === "card") && !isExpanded;
    const description = item.description ?? "";
    const truncatedDescription = shouldTruncate && description.length > 200
        ? description.slice(0, 200) + "..."
        : description;
    const showReadMore = (viewMode === "compact" || viewMode === "card") && description.length > 200;

    // Render Compact Mode
    if (viewMode === "compact") {
        return (
            <div id={`entry-${item.id}`} className={cn("group relative overflow-hidden rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm p-3 transition-all hover:bg-muted/80 hover:border-border/80 scroll-mt-24", focused && "ring-2 ring-primary border-primary/60")}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                        <Link
                            href={entryHref}
                            className={cn(
                                "font-bold text-base truncate shrink-0 max-w-[50%] hover:text-primary hover:underline underline-offset-4",
                                LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY]
                            )}
                        >
                            {item.word}
                        </Link>
                        <Badge
                            variant="secondary"
                            title={dictInfo.name}
                            className="text-[10px] px-1.5 h-5 shrink-0 bg-muted/50 border-transparent"
                        >
                            {dictInfo.short}
                        </Badge>
                        <span className="text-sm text-muted-foreground truncate italic min-w-0">
                            {truncatedDescription}
                        </span>
                    </div>
                    <div className="flex gap-1 shrink-0 items-center">
                        {hasAudio && (
                            <AudioPlayer audioUrl={audioUrl} wordId={item.id!} compact />
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={() => onCopyDescription(description)}
                            title="Copy description"
                        >
                            <Icons.clipboard className="h-4 w-4" />
                        </Button>
                        {!asBrowse && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => onEditItem(item.id!)}
                                title="Edit"
                            >
                                <Icons.edit className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render Card/Detailed Mode
    return (
        <div
            id={`entry-${item.id}`}
            className={cn(
                "group relative flex flex-col h-full rounded-xl border border-border/40 bg-background/60 backdrop-blur-md p-4 sm:p-5 transition-all duration-300 scroll-mt-24",
                "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
                viewMode === "detailed" ? "sm:p-7 space-y-4" : "",
                focused && "ring-2 ring-primary border-primary/60"
            )}
        >
            {/* Decorative Gradient Blob */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Header */}
            <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={cn(
                            "font-bold tracking-tight text-foreground transition-colors group-hover:text-primary",
                            textSize === "sm" ? "text-lg" : textSize === "lg" ? "text-2xl" : "text-xl",
                            LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY]
                        )}>
                            <Link
                                href={entryHref}
                                className="hover:underline underline-offset-4 decoration-primary/40"
                            >
                                {item.word}
                            </Link>
                        </h3>
                        {/* {hasRelevanceScore && (
                            <Badge
                                variant="outline"
                                className="font-mono text-[10px] py-0 px-1.5 h-4.5 bg-primary/5 border-primary/20 text-primary/80"
                            >
                                {relevanceScore}% match
                            </Badge>
                        )} */}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Badge
                            variant="secondary"
                            title={dictInfo.name}
                            className="bg-muted/50 text-[10px] px-1.5 h-5 border-transparent"
                        >
                            {dictInfo.short}
                        </Badge>
                        {showMatchType && item.matchType && MATCH_LABEL[item.matchType] && (
                            <span className="flex items-center gap-1 opacity-70">
                                <span className="w-1 h-1 rounded-full bg-border" />
                                {MATCH_LABEL[item.matchType]}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className={cn(
                    "flex gap-1 items-center",
                    isTouchDevice ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                )}>
                    {hasAudio && (
                        <AudioPlayer audioUrl={audioUrl} wordId={item.id!} compact />
                    )}
                    {onCompare && item.word && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 hover:bg-primary/10 hover:text-primary text-muted-foreground"
                            onClick={() => onCompare(item.word!)}
                            title="Compare across dictionaries"
                        >
                            <Icons.gitCompare className="size-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 hover:bg-primary/10 hover:text-primary text-muted-foreground"
                        onClick={() => onCopyDescription(description)}
                        title="Copy description"
                    >
                        <Icons.clipboard className="size-4" />
                    </Button>
                    {!asBrowse && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 hover:bg-primary/10 hover:text-primary text-muted-foreground"
                            onClick={() => onEditItem(item.id!)}
                            title="Edit entry"
                        >
                            <Icons.edit className="size-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Description Content */}
            <div className={cn(
                "relative flex-1",
                LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY],
                `text-${textSize} leading-relaxed text-foreground/90 overflow-hidden`,
                viewMode === "card" && !isExpanded && "max-h-32"
            )}>
                {searchTerm && searchTerm.trim().length > 0 ? (
                    <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-p:leading-relaxed prose-p:my-0">
                        <SearchResultHighlight
                            text={truncatedDescription}
                            searchTerm={searchTerm}
                            language={language}
                        />
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-p:leading-relaxed prose-p:my-0">
                        <Markdown
                            remarkPlugins={[remarkGfm]}
                        >
                            {truncatedDescription}
                        </Markdown>
                    </div>
                )}

                {/* Truncation Overlay */}
                {shouldTruncate && description.length > 200 && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/90 via-background/40 to-transparent pointer-events-none" />
                )}
            </div>

            {/* Card Footer Features */}
            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/30">
                {showReadMore && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 text-xs font-semibold bg-muted/40 hover:bg-muted/60"
                    >
                        {isExpanded ? (
                            <>
                                <Icons.chevronDown className="mr-1.5 h-3 w-3 rotate-180" />
                                Show less
                            </>
                        ) : (
                            <>
                                <Icons.chevronDown className="mr-1.5 h-3 w-3" />
                                Read more
                            </>
                        )}
                    </Button>
                )}

                {/* Detailed mode extra info */}
                {viewMode === "detailed" && (
                    <div className="w-full space-y-3 pt-2">
                        {item.phonetic && (
                            <div className="flex gap-2 text-sm italic text-muted-foreground">
                                <span className="font-semibold not-italic text-foreground/70">Phonetic:</span>
                                <span>{item.phonetic}</span>
                            </div>
                        )}
                        {item.attributes && item.attributes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {item.attributes.map((attr, idx) => (
                                    <Badge key={idx} variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 bg-muted/20">
                                        {attr.key}: {attr.value}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

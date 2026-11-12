"use client";

import Markdown from "react-markdown";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { TRANSLITERATION_SCHEME_LABELS } from "@/types/sanscript";
import type { SansPlayData } from "./results";
import useSansPlayStore, { type RFState } from "./sans-play-store";
import { TOOLS } from "./sans-play-tools";

/** The one selected result node, if that is all that is selected */
const selectedResultId = (state: RFState) => {
  const selected = state.nodes.filter((node) => node.selected);
  return selected.length === 1 && selected[0].type === "sansPlay"
    ? selected[0].id
    : null;
};

const SEND_TO = TOOLS.filter((tool) => tool.key !== "textInput");

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * Everything known about the selected result, and the tools it can be sent
 * to. A bottom sheet on a phone, a side card on wider screens.
 */
export default function SansPlayDetails({
  onSendTo,
}: {
  /** Adds the tool fed by the given node */
  onSendTo: (sourceId: string, toolKey: string) => void;
}) {
  const id = useSansPlayStore(selectedResultId);
  const node = useSansPlayStore((state) =>
    id ? state.nodes.find((n) => n.id === id) : undefined,
  );
  const nodes = useSansPlayStore((state) => state.nodes);
  const edges = useSansPlayStore((state) => state.edges);
  const selectNode = useSansPlayStore((state) => state.selectNode);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  if (!id || !node) return null;
  const data = node.data as SansPlayData;
  const text = data.text ?? data.label;
  const labelOf = (nodeId: string) => {
    const other = nodes.find((n) => n.id === nodeId);
    return other?.type === "sansPlay" ? (other.data as SansPlayData) : undefined;
  };

  const parent = edges
    .filter((edge) => edge.target === id)
    .map((edge) => labelOf(edge.source))
    .find((other) => other?.kind === "word");
  const dependents = edges
    .filter((edge) => edge.source === id)
    .map((edge) => ({ id: edge.target, data: labelOf(edge.target) }))
    .filter(
      (child): child is { id: string; data: SansPlayData } =>
        child.data?.kind === "word" && child.data.ownerId === data.ownerId,
    );

  return (
    <aside
      aria-label="Details of the selected result"
      className="nowheel nopan absolute inset-x-2 bottom-2 z-10 flex max-h-[55%] flex-col gap-3 overflow-y-auto rounded-lg border bg-card p-3 text-card-foreground shadow-lg sm:inset-x-auto sm:bottom-auto sm:right-2 sm:top-2 sm:max-h-[calc(100%-1rem)] sm:w-80"
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-lg font-semibold leading-snug">
            {data.kind === "group" ? text : data.label}
          </h3>
          {data.kind === "group" && (
            <p className="text-sm text-muted-foreground">{data.label}</p>
          )}
          {data.root && (
            <p className="text-sm text-muted-foreground">√ {data.root}</p>
          )}
          {!data.root && data.subTitle && (
            <p className="text-sm text-muted-foreground">{data.subTitle}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => copyToClipboard(text)}
          title="Copy"
          aria-label="Copy"
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => selectNode(null)}
          title="Close details"
          aria-label="Close details"
        >
          <XIcon />
        </Button>
      </header>

      {parent && (
        <Section title="Relation">
          <p className="text-sm">
            <span className="font-medium">{data.relation || "related"}</span>
            <span className="text-muted-foreground"> of </span>
            {parent.label}
          </p>
        </Section>
      )}

      {data.tags && data.tags.length > 0 && (
        <Section title="Grammar">
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {dependents.length > 0 && (
        <Section title="Dependents">
          <ul className="space-y-1 text-sm">
            {dependents.map((child) => (
              <li key={child.id}>
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:underline"
                  onClick={() => selectNode(child.id)}
                >
                  {child.data.label}
                </button>
                {child.data.relation && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {child.data.relation}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.description && (
        <Section title="Entry">
          <div className="markdown-content text-sm">
            <Markdown>{data.description}</Markdown>
          </div>
        </Section>
      )}

      <Section
        title={
          data.scheme
            ? `Send to · ${TRANSLITERATION_SCHEME_LABELS[data.scheme]}`
            : "Send to"
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {SEND_TO.map((tool) => (
            <Button
              key={tool.key}
              variant="outline"
              size="icon"
              onClick={() => onSendTo(id, tool.key)}
              title={`Send to a new ${tool.title}`}
              aria-label={`Send to a new ${tool.title}`}
            >
              <tool.icon />
            </Button>
          ))}
        </div>
      </Section>
    </aside>
  );
}

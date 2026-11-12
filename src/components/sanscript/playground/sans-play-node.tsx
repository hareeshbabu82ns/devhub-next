import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BaseNode } from "@/components/graph/BaseNode";
import { cn } from "@/lib/utils";
import { RESULT_WIDTH } from "./layout";
import type { SansPlayData } from "./results";

export type { SansPlayData } from "./results";

/** Tags shown on the node itself; the details panel lists all of them */
const MAX_TAGS = 4;

/** Markdown emphasis markers add noise in a small plain text preview */
export const plainText = (markdown: string) =>
  markdown.replace(/[*_]{1,2}/g, "").replace(/\s+/g, " ").trim();

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border bg-muted/60 px-1.5 py-px text-[11px] leading-4 text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * One result of a tool. Compact on purpose: selecting it opens the details
 * panel with everything the service returned.
 */
function SansPlayNode({ data, selected }: NodeProps<Node<SansPlayData>>) {
  const kind = data.kind ?? "word";
  const tags = data.tags ?? [];
  const isGroup = kind === "group";

  return (
    <BaseNode
      selected={selected}
      style={{ width: RESULT_WIDTH[kind] }}
      className={cn(
        "cursor-pointer text-left",
        isGroup
          ? "rounded-full bg-muted px-3 py-1 text-center text-xs font-semibold tracking-wide text-muted-foreground"
          : "flex flex-col gap-1 border-l-4 px-2.5 py-2",
        kind === "word" && "border-l-primary/60",
        kind === "entry" && "border-l-amber-500/70",
        kind === "text" && "border-l-sky-500/70",
        selected && "ring-2 ring-primary",
      )}
    >
      {isGroup ? (
        <span className="block truncate">{data.label}</span>
      ) : (
        <>
          <div className="flex items-start gap-1.5">
            {data.index !== undefined && (
              <span className="mt-0.5 shrink-0 rounded bg-muted px-1 text-[11px] font-medium leading-5 tabular-nums text-muted-foreground">
                {data.index}
              </span>
            )}
            <span className="min-w-0 flex-1 break-words text-base font-medium leading-snug">
              {data.label}
            </span>
          </div>
          {(data.root || data.subTitle) && (
            <div className="truncate text-xs text-muted-foreground">
              {data.root ? `√ ${data.root}` : data.subTitle}
            </div>
          )}
          {data.description && (
            <p className="line-clamp-3 text-xs leading-4 text-muted-foreground">
              {plainText(data.description)}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, MAX_TAGS).map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
              {tags.length > MAX_TAGS && (
                <Tag>+{tags.length - MAX_TAGS}</Tag>
              )}
            </div>
          )}
        </>
      )}

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
}

export default memo(SansPlayNode);

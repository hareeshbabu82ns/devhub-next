import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { BaseNode } from "@/components/graph/BaseNode";

export type SansPlayData = {
  label: string;
  subTitle?: string;
  tags?: string[];
  /** Longer text shown under the label, e.g. a dictionary entry */
  description?: string;
};

/** Markdown emphasis markers add noise in a small plain text preview */
const plainText = (markdown: string) =>
  markdown.replace(/[*_]{1,2}/g, "").replace(/\s+/g, " ").trim();

function SansPlayNode({ id, data, selected }: NodeProps<Node<SansPlayData>>) {
  return (
    <BaseNode
      key={id}
      selected={selected}
      className="min-w-[172px] max-w-[280px] min-h-[70px] flex flex-col justify-center items-center gap-1 p-2"
    >
      <div className="flex-1 flex items-center justify-center text-center">
        {data.label} {data.subTitle && `(${data.subTitle})`}
      </div>
      {data.description && (
        <p
          className="line-clamp-4 text-xs text-muted-foreground"
          title={plainText(data.description)}
        >
          {plainText(data.description)}
        </p>
      )}
      {data.tags && data.tags.length > 0 && (
        <div className="flex gap-1 max-w-[160px] overflow-auto no-scrollbar">
          {data.tags.map((tag, index) => (
            <Badge key={index} variant={"outline"}>
              <span className="text-xs">{tag}</span>
            </Badge>
          ))}
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </BaseNode>
  );
}

export default SansPlayNode;

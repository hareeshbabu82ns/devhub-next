import { memo, useCallback } from "react";
import {
  Position,
  Handle,
  useReactFlow,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { TypeIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { BaseNode } from "./BaseNode";
import TextInputHandle from "./TextInputHandle";
import {
  NodeHeader,
  NodeHeaderActions,
  NodeHeaderClearAction,
  NodeHeaderDeleteAction,
  NodeHeaderIcon,
  NodeHeaderTitle,
} from "./NodeHeader";

/** Rendered width; the playground layout estimates with the same number */
export const TEXT_INPUT_WIDTH = 260;

/**
 * A piece of text to feed to other nodes. It can hold several lines (a whole
 * verse), be emptied, and be removed from the canvas. Nodes connected to its
 * left side fill it in: one line per connected node.
 */
function TextInputNode({
  id,
  data,
  selected,
}: NodeProps<Node<{ text: string }>>) {
  const { updateNodeData } = useReactFlow();

  const onConnectedText = useCallback(
    (value: string) => {
      if (value && value !== data.text) updateNodeData(id, { text: value });
    },
    [id, updateNodeData, data.text],
  );

  return (
    <BaseNode selected={selected} className="p-0" style={{ width: TEXT_INPUT_WIDTH }}>
      <NodeHeader className="border-b rounded-t-md bg-muted text-sidebar-foreground">
        <NodeHeaderIcon>
          <TypeIcon />
        </NodeHeaderIcon>
        <NodeHeaderTitle>Text</NodeHeaderTitle>
        <NodeHeaderActions>
          <NodeHeaderDeleteAction />
          <NodeHeaderClearAction
            onClick={() => updateNodeData(id, { text: "" })}
          />
        </NodeHeaderActions>
      </NodeHeader>
      <div className="p-2">
        <Textarea
          onChange={(evt) => updateNodeData(id, { text: evt.target.value })}
          value={data.text ?? ""}
          placeholder="text..."
          aria-label="Text"
          rows={3}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          maxLength={2000}
          // grows with its content up to a point, then scrolls
          className="nodrag nowheel field-sizing-content max-h-60 resize-none"
        />
      </div>
      <TextInputHandle id="text" onChange={onConnectedText} delimiter={"\n"} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
}

export default memo(TextInputNode);
TextInputNode.displayName = "TextInputNode";

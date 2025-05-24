import { memo } from "react";
import {
  Position,
  Handle,
  useReactFlow,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { BaseNode } from "./BaseNode";

function TextInputNode({ id, data }: NodeProps<Node<{ text: string }>>) {
  const { updateNodeData } = useReactFlow();

  return (
    // <div className="p-2 shadow-md rounded-md border-1 border-stone-400 bg-card text-card-foreground">
    <BaseNode>
      <Input
        onChange={(evt) => updateNodeData(id, { text: evt.target.value })}
        value={data.text}
        type="search"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        maxLength={100}
        className="nodrag"
      />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
}

export default memo(TextInputNode);
TextInputNode.displayName = "TextInputNode";

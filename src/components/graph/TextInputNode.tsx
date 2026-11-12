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

function TextInputNode({
  id,
  data,
  selected,
}: NodeProps<Node<{ text: string }>>) {
  const { updateNodeData } = useReactFlow();

  return (
    <BaseNode selected={selected} className="w-[200px]">
      <Input
        onChange={(evt) => updateNodeData(id, { text: evt.target.value })}
        value={data.text}
        type="search"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        maxLength={500}
        className="nodrag"
      />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
}

export default memo(TextInputNode);
TextInputNode.displayName = "TextInputNode";

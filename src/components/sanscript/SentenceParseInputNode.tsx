import { memo } from 'react';
import { Position, Handle, useReactFlow, type NodeProps, type Node } from '@xyflow/react';
import { Input } from '../ui/input';

function SentenceParseInputNode( { id, data }: NodeProps<Node<{ text: string }>> ) {
  const { updateNodeData } = useReactFlow();

  return (
    <div className="p-2 shadow-md rounded-md border-1 border-stone-400 bg-card text-card-foreground">
      <div>Sentence Parse:</div>
      <div>
        <Input
          onChange={( evt ) => updateNodeData( id, { text: evt.target.value } )}
          value={data.text}
          placeholder="Enter sentence here..."
          type="search"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          maxLength={100}
        />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo( SentenceParseInputNode );
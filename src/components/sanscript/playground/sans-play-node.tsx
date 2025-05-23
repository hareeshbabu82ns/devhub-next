import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';

export type SansPlayData = {
  label: string;
  subTitle?: string;
  tags?: string[];
};

function SansPlayNode( { id, data }: NodeProps<Node<SansPlayData>> ) {
  return (
    <div key={id} className="bg-secondary text-secondary-foreground rounded-sm px-2 py-1 shadow-md">
      <div className="flex flex-col items-center gap-1">
        <div className="">
          {data.label} {data.subTitle && `(${data.subTitle})`}
        </div>
        <div className="flex gap-2">
          {data.tags?.map( ( tag, index ) => (
            <Badge key={index} variant={"outline"}>
              <span className='text-xs'>{tag}</span>
            </Badge>
          ) )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default SansPlayNode;
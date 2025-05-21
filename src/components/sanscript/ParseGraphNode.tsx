"use client";

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { SentenceParseGraph } from '@/types/sanscript';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

export default function ParseGraphNode( { data }: { data: SentenceParseGraph } ) {
  return (
    <div className={cn( "p-2 shadow-md rounded-md border-1 border-stone-400",
      data.predecessor ? "bg-secondary text-secondary-foreground" : " bg-primary text-primary-foreground",
    )}>
      <div className="flex flex-col items-center gap-1">
        <div className="">
          {data.node.pada} ({data.node.root})
        </div>
        <div className="flex gap-2">
          {data.node.tags.map( ( tag, index ) => (
            <Badge key={index} variant={"outline"}>
              <span className='text-xs'>{tag}</span>
            </Badge>
          ) )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Right}
        className="w-16 !bg-teal-500"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-16 !bg-teal-500"
      />
    </div>
  );
}
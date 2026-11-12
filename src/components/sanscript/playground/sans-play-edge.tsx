import React from "react";
import {
  BaseEdge,
  type EdgeProps,
  type Edge,
  EdgeLabelRenderer,
  getBezierPath,
} from "@xyflow/react";

/**
 * Edge between a tool and its results, and between related words. The label,
 * when there is one, names the relation and sits on the curve.
 */
function SansPlayEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  style,
  markerEnd,
}: EdgeProps<Edge<{ label?: string }>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const edgeLabel = label || data?.label;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="nodrag nopan absolute max-w-[130px] truncate rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            {edgeLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default SansPlayEdge;

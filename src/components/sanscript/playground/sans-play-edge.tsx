import React from "react";
import {
  BaseEdge,
  type EdgeProps,
  type Edge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "@xyflow/react";

function EdgeLabel({
  transform,
  label,
}: {
  transform: string;
  label: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        transform,
      }}
      className="px-1 py-2 bg-card/50 text-card-foreground text-sm font-semibold nodrag nopan"
    >
      {label}
    </div>
  );
}

function SansPlayEdge(
  props: EdgeProps<
    Edge<{
      label?: string;
      startLabel?: string;
      endLabel?: string;
      [key: string]: any;
    }>
  >,
) {
  const { id, sourceX, sourceY, targetX, targetY, data, label } = props;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const edgeLabel = label || data?.label;

  // if (!data) return <BaseEdge path={edgePath} {...props} />;
  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        {edgeLabel && (
          <EdgeLabel
            transform={`translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px,${(sourceY + targetY) / 2}px)`}
            label={edgeLabel}
          />
        )}
        {data?.startLabel && (
          <EdgeLabel
            transform={`translate(-50%, 0%) translate(${sourceX}px,${sourceY}px)`}
            label={data.startLabel}
          />
        )}
        {data?.endLabel && (
          <EdgeLabel
            transform={`translate(-50%, -100%) translate(${targetX}px,${targetY}px)`}
            label={data.endLabel}
          />
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default SansPlayEdge;

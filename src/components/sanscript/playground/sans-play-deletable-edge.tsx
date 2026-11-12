import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";

/** Edge that feeds a result into another tool; the cross disconnects it */
export default function SansPlayDeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, strokeDasharray: "6 4" }}
      />
      <EdgeLabelRenderer>
        <Button
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          variant="outline"
          size="icon"
          title="Disconnect"
          aria-label="Disconnect"
          className="nodrag nopan pointer-events-auto absolute size-6 rounded-full bg-background"
          onClick={() => {
            setEdges((es) => es.filter((e) => e.id !== id));
          }}
        >
          <Icons.close className="size-3 text-destructive" />
        </Button>
      </EdgeLabelRenderer>
    </>
  );
}

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from "@xyflow/react";

export default function SansPlayDeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <Button
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          variant="ghost"
          size="icon"
          className="nodrag nopan rounded-full"
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

import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
  type HTMLAttributes,
  useCallback,
} from "react";
import { Panel, useReactFlow } from "@xyflow/react";

import NodeInspector from "./NodeInspector";
import ChangeLogger from "./ChangeLogger";
import ViewportLogger from "./ViewportLogger";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { layoutAll } from "../sanscript/playground/layout";
import { LogsIcon, MaximizeIcon, PlusIcon, WorkflowIcon } from "lucide-react";

export default function DevTools({
  showChangeLogger = true,
  showNodeInspector = true,
  showViewportLogger = true,
}: {
  showChangeLogger?: boolean;
  showNodeInspector?: boolean;
  showViewportLogger?: boolean;
}) {
  const { fitView, getEdges, getNodes, setNodes } = useReactFlow();

  const [nodeInspectorActive, setNodeInspectorActive] =
    useState(showNodeInspector);
  const [changeLoggerActive, setChangeLoggerActive] =
    useState(showChangeLogger);
  const [viewportLoggerActive, setViewportLoggerActive] =
    useState(showViewportLogger);

  const onLayout = useCallback(
    () => {
      const positions = layoutAll(getNodes(), getEdges());
      setNodes((nodes) =>
        nodes.map((node) => ({
          ...node,
          position: positions.get(node.id) ?? node.position,
        })),
      );
      fitView();
    },
    [getNodes, getEdges, setNodes, fitView],
  );

  return (
    <div>
      <Panel position="top-right" className="flex flex-row gap-2">
        <DevToolButton
          setActive={setNodeInspectorActive}
          active={nodeInspectorActive}
          title="Toggle Node Inspector"
        >
          <WorkflowIcon className="size-4" />
        </DevToolButton>
        <DevToolButton
          setActive={setChangeLoggerActive}
          active={changeLoggerActive}
          title="Change Logger"
        >
          <LogsIcon className="size-4" />
        </DevToolButton>
        <DevToolButton
          setActive={setViewportLoggerActive}
          active={viewportLoggerActive}
          title="Viewport Logger"
        >
          <PlusIcon className="size-4" />
        </DevToolButton>
        <DevToolButton
          setActive={() => {
            onLayout();
          }}
          active={false}
          title="ReLayout"
        >
          <MaximizeIcon className="size-4" />
        </DevToolButton>
      </Panel>
      {changeLoggerActive && <ChangeLogger />}
      {nodeInspectorActive && <NodeInspector />}
      {viewportLoggerActive && <ViewportLogger />}
    </div>
  );
}

function DevToolButton({
  active,
  setActive,
  children,
  ...rest
}: {
  active: boolean;
  setActive: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
} & HTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={() => setActive((a) => !a)}
      className={cn(active ? "!border-secondary" : "")}
      {...rest}
    >
      {children}
    </Button>
  );
}

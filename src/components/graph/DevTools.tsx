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
import { getLayoutedElements } from "../sanscript/playground/utils";
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
  const { fitView, getEdges, getNodes, setNodes, setEdges } = useReactFlow();

  const [nodeInspectorActive, setNodeInspectorActive] =
    useState(showNodeInspector);
  const [changeLoggerActive, setChangeLoggerActive] =
    useState(showChangeLogger);
  const [viewportLoggerActive, setViewportLoggerActive] =
    useState(showViewportLogger);

  const onLayout = useCallback(
    (direction: "TB" | "LR") => {
      // console.log(nodes);

      const layouted = getLayoutedElements(getNodes(), getEdges(), direction);

      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);

      fitView();
    },
    [getNodes, getEdges, setNodes, setEdges, fitView],
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
            onLayout("TB");
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

import {
  ReactFlow,
  Controls,
  Panel,
  NodeOrigin,
  Background,
  ConnectionLineType,
  OnConnectStart,
  OnConnectEnd,
  useStoreApi,
  useReactFlow,
  InternalNode,
} from "@xyflow/react";

import { useShallow } from "zustand/shallow";
import useStore, { RFState } from "./mind-map-store";

import "./styles.css";

// we have to import the React MindMapGraph styles for it to work
import "@xyflow/react/dist/style.css";

import MindMapNode from "./mind-map-node";
import MindMapEdge from "./mind-map-edge";
import { useCallback, useRef } from "react";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  addChildNode: state.addChildNode,
});

const nodeTypes = {
  mindmap: MindMapNode,
};

const edgeTypes = {
  mindmap: MindMapEdge,
};

const nodeOrigin: NodeOrigin = [0.5, 0.5];
const connectionLineStyle = { stroke: "#F6AD55", strokeWidth: 3 };
const defaultEdgeOptions = { style: connectionLineStyle, type: "mindmap" };

function MindMapGraph() {
  const { nodes, edges, onNodesChange, onEdgesChange, addChildNode } = useStore(
    useShallow(selector),
  );
  const connectingNodeId = useRef<string | null>(null);
  const store = useStoreApi();
  const { screenToFlowPosition } = useReactFlow();

  const getChildNodePosition = (
    event: MouseEvent | TouchEvent,
    parentNode?: InternalNode,
  ) => {
    const { domNode } = store.getState();

    if (
      !domNode ||
      // we need to check if these properties exist, because when a node is not initialized yet,
      // it doesn't have a positionAbsolute nor a width or height
      !parentNode?.internals.positionAbsolute ||
      !parentNode?.measured.width ||
      !parentNode?.measured.height
    ) {
      return;
    }

    const isTouchEvent = "touches" in event;
    const x = isTouchEvent ? event.touches[0].clientX : event.clientX;
    const y = isTouchEvent ? event.touches[0].clientY : event.clientY;
    // we need to remove the wrapper bounds, in order to get the correct mouse position
    const panePosition = screenToFlowPosition({
      x,
      y,
    });

    // we are calculating with positionAbsolute here because child nodes are positioned relative to their parent
    return {
      x:
        panePosition.x -
        parentNode.internals.positionAbsolute.x +
        parentNode.measured.width / 2,
      y:
        panePosition.y -
        parentNode.internals.positionAbsolute.y +
        parentNode.measured.height / 2,
    };
  };

  const onConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      const { nodeLookup } = store.getState();
      const targetIsPane = (event.target as Element).classList.contains(
        "react-flow__pane",
      );
      const node = (event.target as Element).closest(".react-flow__node");

      if (node) {
        node.querySelector("input")?.focus({ preventScroll: true });
      } else if (targetIsPane && connectingNodeId.current) {
        const parentNode = nodeLookup.get(connectingNodeId.current);
        const childNodePosition = getChildNodePosition(event, parentNode);

        if (parentNode && childNodePosition) {
          addChildNode(parentNode, childNodePosition);
        }
      }
    },
    [getChildNodePosition],
  );

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 200px)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeOrigin={nodeOrigin}
        connectionLineStyle={connectionLineStyle}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Straight}
        fitView
      >
        {/* <Controls showInteractive={false} /> */}
        <Panel position="top-left">React MindMapGraph Mind Map</Panel>
        <Controls
          style={{ color: "var(--secondary-foreground)" }}
          showInteractive={false}
        />
        <Background />
      </ReactFlow>
    </div>
  );
}

export default MindMapGraph;

import { useDebounce } from "@/hooks/use-debounce";
import {
  Connection,
  Edge,
  Handle,
  HandleProps,
  HandleType,
  Position,
  useNodeConnections,
  useNodesData,
} from "@xyflow/react";
import { memo, useCallback, useEffect, useState } from "react";
import { BaseHandle } from "./BaseHandle";

function TextInputHandle({
  id,
  onChange,
  delimiter = " ",
  type = "target",
  position = Position.Left,
  limit = -1,
  ...props
}: Omit<HandleProps, "onChange" | "type" | "position"> & {
  id: string;
  onChange: (value: string) => void;
  delimiter?: string;
  type?: HandleType;
  position?: Position;
  limit?: number;
}) {
  const connections = useNodeConnections({
    handleType: "target",
    handleId: id,
  });

  const relevantConnections =
    connections?.filter((conn) => conn.targetHandle === id) || [];

  const connectedNodesData = useNodesData(
    relevantConnections.length
      ? relevantConnections.map((conn) => conn.source)
      : [],
  );

  const [textValue, setTextValue] = useState<string>("");

  // const isValidConnection = useCallback(
  //   (edge: Edge | Connection) => {
  //     console.log("isValidConnection", edge);
  //     const sourceNode = connectedNodesData.find(
  //       (node) => node.id === edge.source,
  //     );
  //     if (!sourceNode) return false;

  //     // Check if the source node is a valid type
  //     const isValidType =
  //       sourceNode.type === "sansPlay" || sourceNode.type === "textInput";

  //     // Check if the limit is reached
  //     const currentConnections = connections.filter(
  //       (conn) => conn.targetHandle === id,
  //     );
  //     const isLimitReached = limit > 0 && currentConnections.length >= limit;

  //     return isValidType && !isLimitReached;
  //   },
  //   [connectedNodesData, connections, id, limit],
  // );

  // Get the combined text value from all connected nodes
  useEffect(() => {
    if (connectedNodesData && connectedNodesData.length > 0) {
      const combinedText = connectedNodesData
        .map((nodeData) =>
          nodeData.type === "sansPlay"
            ? nodeData.data.label
            : (nodeData?.data?.text as string) || "",
        )
        .filter(Boolean)
        .join(delimiter);

      if (combinedText !== textValue) {
        setTextValue(combinedText);
      }
    } else {
      setTextValue("");
    }
  }, [connectedNodesData, textValue, id]);

  const debouncedText = useDebounce(textValue, 500);

  useEffect(() => {
    if (debouncedText) {
      onChange(debouncedText);
    }
  }, [debouncedText, onChange]);

  return (
    <BaseHandle
      type={type}
      position={position}
      id={id}
      className="handle"
      // isValidConnection={isValidConnection}
      {...props}
    />
  );
}

export default memo(TextInputHandle);
TextInputHandle.displayName = "TextInputHandle";

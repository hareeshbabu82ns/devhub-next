import { useDebounce } from "@/hooks/use-debounce";
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
} from "@xyflow/react";
import { memo, useEffect, useState } from "react";

function TextInputHandle({
  id,
  onChange,
}: {
  id: string;
  onChange: (value: string) => void;
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

  // Get the combined text value from all connected nodes
  useEffect(() => {
    if (connectedNodesData && connectedNodesData.length > 0) {
      const combinedText = connectedNodesData
        .map((nodeData) => (nodeData?.data?.text as string) || "")
        .filter(Boolean)
        .join(" ");

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
    <Handle type="target" position={Position.Left} id={id} className="handle" />
  );
}

export default memo(TextInputHandle);

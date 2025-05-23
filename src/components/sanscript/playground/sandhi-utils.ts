"use client";

import { Edge, MarkerType, Node } from "@xyflow/react";
import { nanoid } from "nanoid/non-secure";
import { GraphData } from "./utils";

/**
 * Transforms sandhi split results into a graph visualization.
 * This function takes arrays of split strings and converts them into a directed graph
 * showing the relationship between the original compound and its splits.
 *
 * @param parentId - ID of parent node to connect all split results to
 * @param splitResults - Array of string arrays representing sandhi splits
 * @returns GraphData object with nodes and edges ready for rendering
 */
export function transformSandhiSplitsToGraphData(
  parentId: string,
  splitResults: string[][],
): GraphData {
  // Initialize empty graph data structure
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Generate a unique ID for this split group
  const splitId = nanoid();

  // Process each split result and collect their graph representations
  const graphDataList = splitResults.map((splitResult, splitIndex) =>
    processSplitResult(splitResult, splitIndex, splitId, parentId),
  );

  // Merge all graph data into a single graph structure
  mergeGraphData(graphData, graphDataList);

  // If a parent ID is provided, ensure all root nodes are connected to it
  if (parentId) {
    connectOrphanNodesToParent(graphData.nodes, parentId);
  }

  return graphData;
}

/**
 * Processes a single split result into graph data.
 *
 * @param splitResult - Individual split result array to process
 * @param splitIndex - Index of this result in the original array
 * @param splitId - Unique ID for the current split operation
 * @param parentId - Optional parent ID to connect to
 * @returns GraphData for this split result
 */
function processSplitResult(
  splitResult: string[],
  splitIndex: number,
  splitId: string,
  parentId?: string,
): GraphData {
  // Initialize graph data for this split result
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Skip if no split elements are available
  if (!splitResult || splitResult.length === 0) {
    return graphData;
  }

  // Create a node representing this split result
  const splitNode = createSplitNode(splitId, splitIndex);
  graphData.nodes.push(splitNode);

  // Create nodes for each word in the split
  splitResult.forEach((word, wordIndex) => {
    const wordNode = createWordNode(
      `${splitNode.id}-word-${wordIndex}`,
      word,
      splitNode.id,
    );
    graphData.nodes.push(wordNode);

    // Connect to the split node
    graphData.edges.push(
      createEdge(splitNode.id, wordNode.id, `${wordIndex + 1}`, {
        splitIndex,
        wordIndex,
      }),
    );
  });

  // If a parent ID is provided, connect the split node to it
  if (parentId) {
    connectToParent(graphData, parentId, splitNode.id);
  }

  return graphData;
}

/**
 * Creates a node representing a split result.
 *
 * @param splitId - Unique ID for this split operation
 * @param splitIndex - Index of the split result
 * @returns Node representing the split result
 */
function createSplitNode(splitId: string, splitIndex: number): Node {
  return {
    id: `${splitId}-${splitIndex}`,
    data: { label: `Split ${splitIndex + 1}` },
    type: "sansPlay",
    position: { x: 0, y: 0 },
  } satisfies Node;
}

/**
 * Creates a node representing a word in a split.
 *
 * @param id - ID for the new node
 * @param word - Word text to display
 * @param parentId - ID of parent split node
 * @returns Node representing the word
 */
function createWordNode(id: string, word: string, parentId: string): Node {
  return {
    id: id,
    position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
    data: {
      label: word,
    },
    type: "sansPlay",
    parentId,
  } satisfies Node;
}

/**
 * Creates an edge between two nodes.
 *
 * @param source - Source node ID
 * @param target - Target node ID
 * @param label - Label for the edge
 * @param data - Additional data to store with the edge
 * @returns Edge object
 */
function createEdge(
  source: string,
  target: string,
  label: string,
  data: any = {},
): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    label,
    data,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  } satisfies Edge;
}

/**
 * Connects a node to a parent via an edge.
 *
 * @param graphData - Graph data to add edge to
 * @param parentId - ID of parent node
 * @param targetId - ID of target node
 */
function connectToParent(
  graphData: GraphData,
  parentId: string,
  targetId: string,
): void {
  graphData.edges.push(createEdge(parentId, targetId, "Sandhi Split", {}));
}

/**
 * Merges multiple graph data objects into a single graph.
 *
 * @param targetGraph - Target graph to merge into
 * @param sourceGraphs - Source graphs to merge from
 */
function mergeGraphData(
  targetGraph: GraphData,
  sourceGraphs: GraphData[],
): void {
  sourceGraphs.forEach((data) => {
    if (data && data.nodes.length > 0) {
      targetGraph.nodes.push(...data.nodes);
      targetGraph.edges.push(...data.edges);
    }
  });
}

/**
 * Connects all nodes without parents to a specified parent.
 *
 * @param nodes - Nodes to check
 * @param parentId - Parent ID to assign
 */
function connectOrphanNodesToParent(nodes: Node[], parentId: string): void {
  nodes.forEach((node) => {
    if (!node.parentId) {
      node.parentId = parentId;
    }
  });
}

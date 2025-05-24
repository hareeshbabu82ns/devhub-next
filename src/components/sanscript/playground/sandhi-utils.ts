"use client";

import { Edge, MarkerType, Node } from "@xyflow/react";
import { nanoid } from "nanoid/non-secure";
import { GraphData } from "./utils";
import { LanguageTag } from "@/types/sanscript";

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
function createWordNode(id: string, word: string, parentId?: string): Node {
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
  label?: string,
): void {
  graphData.edges.push(createEdge(parentId, targetId, label || "", {}));
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

/**
 * Transforms sandhi join results into a graph visualization.
 * This function takes an array of joined strings and converts them into a directed graph
 * showing the relationship between the original words and their joined forms.
 *
 * @param parentId - ID of parent node to connect all join results to
 * @param joinResults - Array of strings representing sandhi joins
 * @returns GraphData object with nodes and edges ready for rendering
 */
export function transformSandhiJoinsToGraphData(
  parentId: string,
  joinResults: string[],
): GraphData {
  // Initialize empty graph data structure
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Generate a unique ID for this join group
  const joinId = nanoid();

  // Process each join result and collect their graph representations
  const graphDataList = joinResults.map((joinResult, joinIndex) =>
    processJoinResult(joinResult, joinIndex, joinId, parentId),
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
 * Processes a single join result into graph data.
 *
 * @param joinResult - Individual join result string to process
 * @param joinIndex - Index of this result in the original array
 * @param joinId - Unique ID for the current join operation
 * @param parentId - Optional parent ID to connect to
 * @returns GraphData for this join result
 */
function processJoinResult(
  joinResult: string,
  joinIndex: number,
  joinId: string,
  parentId?: string,
): GraphData {
  // Initialize graph data for this join result
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Skip if no join result is available
  if (!joinResult || joinResult.length === 0) {
    return graphData;
  }

  // Create a node representing this join result
  const joinNode = createJoinNode(joinId, joinIndex, joinResult);
  graphData.nodes.push(joinNode);

  // If a parent ID is provided, connect the join node to it
  if (parentId) {
    connectToParent(graphData, parentId, joinNode.id);
  }

  return graphData;
}

/**
 * Creates a node representing a join result.
 *
 * @param joinId - Unique ID for this join operation
 * @param joinIndex - Index of the join result
 * @param joinText - The joined text to display
 * @returns Node representing the join result
 */
function createJoinNode(
  joinId: string,
  joinIndex: number,
  joinText: string,
): Node {
  return {
    id: `${joinId}-${joinIndex}`,
    data: {
      label: joinText,
      subtitle: `Join ${joinIndex + 1}`,
    },
    type: "sansPlay",
    position: { x: 0, y: 0 },
  } satisfies Node;
}

/**
 * Transforms word tagger results into a graph visualization.
 * This function takes an array of tagged words and converts them into a directed graph
 * showing the relationship between words and their tags.
 *
 * @param parentId - ID of parent node to connect all tagged results to
 * @param tagResults - Array of LanguageTag objects with word and tags information
 * @returns GraphData object with nodes and edges ready for rendering
 */
export function transformWordTaggerToGraphData(
  parentId: string,
  tagResults: LanguageTag[],
): GraphData {
  // Initialize empty graph data structure
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Generate a unique ID for this tagging operation
  const tagGroupId = nanoid();

  // Process each word and collect their graph representations
  const graphDataList = tagResults.map((tagResult, wordIndex) =>
    processWordTags(tagResult, wordIndex, tagGroupId, parentId),
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
 * Processes a single word with its tags into graph data.
 *
 * @param tagResult - Individual word with tags to process
 * @param wordIndex - Index of this word in the original array
 * @param tagGroupId - Unique ID for the current tagging operation
 * @param parentId - Optional parent ID to connect to
 * @returns GraphData for this word and its tags
 */
function processWordTags(
  tagResult: LanguageTag,
  wordIndex: number,
  tagGroupId: string,
  parentId?: string,
): GraphData {
  // Initialize graph data for this word
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Skip if no word is available
  if (!tagResult || !tagResult.word) {
    return graphData;
  }

  // Create a node representing this word
  const wordNode = createWordNode(
    `${tagGroupId}-word-${wordIndex}`,
    tagResult.word,
    parentId,
  );
  graphData.nodes.push(wordNode);

  // Create nodes for each tag for this word
  tagResult.tags.forEach((tag, tagIndex) => {
    const tagNode = createTagNode(
      `${wordNode.id}-tag-${tagIndex}`,
      tag,
      wordNode.id,
    );
    graphData.nodes.push(tagNode);

    // Connect tag to the word node
    graphData.edges.push(
      createEdge(wordNode.id, tagNode.id, "", {
        wordIndex,
        tagIndex,
      }),
    );
  });

  // If a parent ID is provided, connect the word node to it
  if (parentId) {
    connectToParent(graphData, parentId, wordNode.id, "");
  }

  return graphData;
}

// /**
//  * Creates a node representing a word.
//  *
//  * @param id - ID for the new node
//  * @param word - Word text to display
//  * @param parentId - Optional ID of parent node
//  * @returns Node representing the word
//  */
// function createWordNode(id: string, word: string, parentId?: string): Node {
//   return {
//     id: id,
//     position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
//     data: {
//       label: word,
//       subtitle: "Word",
//     },
//     type: "sansPlay",
//     parentId,
//   } satisfies Node;
// }

/**
 * Creates a node representing a grammatical tag.
 *
 * @param id - ID for the new node
 * @param tag - Tag text to display
 * @param parentId - ID of parent word node
 * @returns Node representing the tag
 */
function createTagNode(id: string, tag: string, parentId: string): Node {
  return {
    id: id,
    position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
    data: {
      label: tag,
      subtitle: "Tag",
    },
    type: "sansPlay",
    parentId,
  } satisfies Node;
}

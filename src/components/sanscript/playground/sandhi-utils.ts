"use client";

import { nanoid } from "nanoid/non-secure";
import {
  connectOrphanNodesToParent,
  connectToParent,
  createEdge,
  createNode,
  GraphData,
  mergeGraphData,
} from "./utils";
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
  const splitNode = createNode({
    id: `${splitId}-${splitIndex}`,
    data: {
      label: `Split ${splitIndex + 1}`,
    },
  });
  graphData.nodes.push(splitNode);

  // Create nodes for each word in the split
  splitResult.forEach((word, wordIndex) => {
    const wordNode = createNode({
      id: `${splitNode.id}-word-${wordIndex}`,
      parentId: splitNode.id,
      data: {
        label: word,
      },
    });
    graphData.nodes.push(wordNode);

    // Connect to the split node
    const wordEdge = createEdge({
      source: splitNode.id,
      target: wordNode.id,
      data: {
        endLabel: `${wordIndex + 1}`,
        splitIndex,
        wordIndex,
      },
    });
    graphData.edges.push(wordEdge);
  });

  // If a parent ID is provided, connect the split node to it
  if (parentId) {
    connectToParent({
      graphData,
      parentId,
      targetId: splitNode.id,
    });
  }

  return graphData;
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
  const joinNode = createNode({
    id: `${joinId}-${joinIndex}`,
    data: {
      label: joinResult,
      subtitle: `Join ${joinIndex + 1}`,
    },
  });
  graphData.nodes.push(joinNode);

  // If a parent ID is provided, connect the join node to it
  if (parentId) {
    connectToParent({
      graphData,
      parentId,
      targetId: joinNode.id,
    });
  }

  return graphData;
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
  options?: { tagsAsNodes?: boolean },
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
    processWordTags(tagResult, wordIndex, tagGroupId, parentId, options),
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
  options?: { tagsAsNodes?: boolean },
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
  const wordNode = createNode({
    id: `${tagGroupId}-word-${wordIndex}`,
    parentId,
    data: {
      label: tagResult.word,
      tags: options?.tagsAsNodes ? undefined : tagResult.tags,
    },
  });
  graphData.nodes.push(wordNode);

  if (options?.tagsAsNodes) {
    // Create nodes for each tag for this word
    tagResult.tags.forEach((tag, tagIndex) => {
      // const tagNode = createTagNode({
      //   id: `${wordNode.id}-tag-${tagIndex}`,
      //   tag,
      //   parentId: wordNode.id,
      // });
      const tagNode = createNode({
        id: `${wordNode.id}-tag-${tagIndex}`,
        parentId: wordNode.id,
        data: {
          label: tag,
        },
      });
      graphData.nodes.push(tagNode);

      // Connect tag to the word node
      graphData.edges.push(
        createEdge({
          source: wordNode.id,
          target: tagNode.id,
          data: {
            endLabel: `${tagIndex + 1}`,
            wordIndex,
            tagIndex,
          },
        }),
      );
    });
  }

  // If a parent ID is provided, connect the word node to it
  if (parentId) {
    connectToParent({
      graphData,
      parentId,
      targetId: wordNode.id,
      label: "",
    });
  }

  return graphData;
}

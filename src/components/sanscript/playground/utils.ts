"use client";

import dagre from "@dagrejs/dagre";
import {
  SentenceParseAnalysis,
  SentenceParseGraph,
  SentenceParseResult,
} from "@/types/sanscript";
import { Edge, MarkerType, Node, Position } from "@xyflow/react";
import { nanoid } from "nanoid/non-secure";
import { getHierarchicalLayout } from "./hierarchy-layout";
import { getChildNodes } from "./hierarchy-utils";

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Applies automatic layout to a graph using the Dagre algorithm.
 * Calculates positions for all nodes in the graph based on the specified direction.
 *
 * @param nodes - Array of nodes to position
 * @param edges - Array of edges connecting the nodes
 * @param direction - Layout direction ('TB' = top to bottom, 'LR' = left to right)
 * @param nodeWidth - Default width of each node in pixels
 * @param nodeHeight - Default height of each node in pixels
 * @returns Object containing positioned nodes and unchanged edges
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction = "TB",
  nodeWidth = 172,
  nodeHeight = 70,
  layoutStyle: "dagre" | "hierarchical" = "dagre",
): { nodes: Node[]; edges: Edge[] } {
  // Skip layout if no nodes to position
  if (nodes.length === 0) return { nodes, edges };

  if (layoutStyle === "hierarchical") {
    return getHierarchicalLayout({
      nodes,
      edges,
      options: { nodeWidth, nodeHeight },
    });
  }

  // Create a fresh graph instance for each layout operation to prevent interference
  // between multiple calls to this function
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  // Set graph direction (TB = top-bottom, LR = left-right)
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    align: "UL",
    nodesep: 50,
    edgesep: 50,
    ranksep: 50,
    // acyclicer: "greedy",
    ranker: "tight-tree",
    // ranker: "network-simplex",
  });

  // Add nodes to the dagre graph with dimensions
  addNodesToDagreGraph(dagreGraph, nodes, nodeWidth, nodeHeight);

  // Add edges to the dagre graph
  addEdgesToDagreGraph(dagreGraph, edges);

  // Calculate layout using dagre algorithm
  dagre.layout(dagreGraph);

  // Apply calculated positions to the original nodes
  const positionedNodes = applyCalculatedPositions(
    nodes,
    dagreGraph,
    isHorizontal,
    nodeWidth,
    nodeHeight,
  );

  return { nodes: positionedNodes, edges };
}

/**
 * Adds nodes to the Dagre graph with their dimensions.
 *
 * @param dagreGraph - Dagre graph instance
 * @param nodes - Nodes to add
 * @param nodeWidth - Default node width
 * @param nodeHeight - Default node height
 */
function addNodesToDagreGraph(
  dagreGraph: dagre.graphlib.Graph,
  nodes: Node[],
  nodeWidth: number,
  nodeHeight: number,
): void {
  nodes.forEach((node) => {
    // Use custom dimensions from node data if available, otherwise use defaults
    const width = (node.data?.width as number) || nodeWidth;
    const height = (node.data?.height as number) || nodeHeight;

    dagreGraph.setNode(node.id, { width, height });
  });
}

/**
 * Adds edges to the Dagre graph.
 *
 * @param dagreGraph - Dagre graph instance
 * @param edges - Edges to add
 */
function addEdgesToDagreGraph(
  dagreGraph: dagre.graphlib.Graph,
  edges: Edge[],
): void {
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
}

/**
 * Applies the calculated positions from Dagre to the original nodes.
 *
 * @param nodes - Original nodes
 * @param dagreGraph - Dagre graph with calculated positions
 * @param isHorizontal - Whether layout is horizontal (LR) or vertical (TB)
 * @param nodeWidth - Default node width
 * @param nodeHeight - Default node height
 * @returns Nodes with updated positions
 */
function applyCalculatedPositions(
  nodes: Node[],
  dagreGraph: dagre.graphlib.Graph,
  isHorizontal: boolean,
  nodeWidth: number,
  nodeHeight: number,
): Node[] {
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Some nodes might not have positions calculated (e.g., if they're not connected)
    if (!nodeWithPosition) {
      return node;
    }

    // Adjust connection points based on layout direction
    const targetPosition = isHorizontal ? Position.Left : Position.Top;
    const sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // Create new node with updated position
    return {
      ...node,
      targetPosition,
      sourcePosition,
      // Adjust position from Dagre's center point to React Flow's top-left origin
      position: {
        x:
          node.position.x ||
          nodeWithPosition.x - ((node.data?.width as number) || nodeWidth) / 2,
        y:
          node.position.y ||
          nodeWithPosition.y -
            ((node.data?.height as number) || nodeHeight) / 2,
      },
    };
  }) as Node[];
}

/**
 * Transforms parse results into graph data for visualization.
 * Main entry point for converting sentence parse results to a renderable graph.
 *
 * @param parentId - ID of parent node to connect all parse results to
 * @param parseResults - Array of parsing results to transform
 * @returns GraphData object with nodes and edges ready for rendering
 */
export function transformSentenceParseToGraphData(
  parentId: string,
  parseResults: SentenceParseResult[],
  consolidatedGraph = true,
): GraphData {
  // Initialize empty graph data structure
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // console.log("Parse Results:", parseResults);
  const consolidatedResults = consolidatedGraph
    ? [consolidateParseResults(parseResults)]
    : parseResults;
  // console.log("Parse Results (consolidated):", consolidatedResults);

  // Generate a unique ID for this parse group
  const parseId = nanoid();

  // Process each parse result and collect their graph representations
  // const graphDataList = parseResults.map((parseResult, parseIndex) =>
  //   processParseResult(parseResult, parseIndex, parseId, parentId),
  // );
  const graphDataList = consolidatedResults.map((parseResult, parseIndex) =>
    processParseResult(parseResult, parseIndex, parseId, parentId),
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
 * Processes a single parse result into graph data.
 *
 * @param parseResult - Individual parse result to process
 * @param parseIndex - Index of this result in the original array
 * @param parseId - Unique ID for the current parse operation
 * @param parentId - Optional parent ID to connect to
 * @returns GraphData for this parse result
 */
export function processParseResult(
  parseResult: SentenceParseResult,
  parseIndex: number,
  parseId: string,
  parentId?: string,
): GraphData {
  // Initialize graph data for this parse result
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Skip if no analysis is available
  if (!parseResult.analysis || parseResult.analysis.length === 0) {
    return graphData;
  }

  // Filter for analyses that have graph data
  const analysisFiltered = filterValidAnalyses(parseResult.analysis);
  if (analysisFiltered.length === 0) {
    return graphData;
  }

  // Create a node representing this parse result
  const parseNode = createNode({
    id: `${parseId}-${parseIndex}`,
    data: {
      label: `Graph ${parseIndex + 1}`,
    },
  });
  graphData.nodes.push(parseNode);

  // Process each analysis in this parse result
  analysisFiltered.forEach((analysis, analysisIndex) => {
    // Create nodes and edges for this analysis
    processAnalysis(analysis, analysisIndex, parseNode, graphData);
  });

  // Organize nodes in hierarchical order
  organizeNodesHierarchically(graphData);

  // Ensure all nodes have proper parent relationships
  ensureNodeParenting(graphData, parseNode);

  // If a parent ID is provided, connect the parse node to it
  if (parentId) {
    connectToParent({ graphData, parentId, targetId: parseNode.id });
  }

  return graphData;
}

/**
 * Filters analyses to include only those with valid graph data.
 *
 * @param analyses - Array of analyses to filter
 * @returns Filtered array of analyses with valid graph data
 */
function filterValidAnalyses(analyses: any[]): any[] {
  return analyses.filter((a) => a.graph && a.graph.length > 0);
}

/**
 * Creates a node representing a node in a graph.
 *
 * @param id - ID for the new node
 * @param parentId - ID of parent node
 * @param data - Data to store with the node
 * @returns Node representing the graph node
 */
export function createNode({
  id,
  parentId,
  data = {},
}: {
  id: string;
  parentId?: string;
  tags?: string[];
  data: {
    label?: string;
    subTitle?: string;
    tags?: string[];
    [key: string]: any;
  };
}): Node {
  return {
    id,
    // parentId,
    position: { x: 0, y: 0 },
    data: data,
    type: "sansPlay",
  } satisfies Node;
}

/**
 * Processes an individual analysis, creating nodes and edges.
 *
 * @param analysis - Analysis to process
 * @param analysisIndex - Index of this analysis
 * @param parseNode - Parent parse node
 * @param graphData - Graph data to populate
 */
function processAnalysis(
  analysis: SentenceParseAnalysis,
  analysisIndex: number,
  parseNode: Node,
  graphData: GraphData,
): void {
  // Create a Set of existing node IDs for faster lookups
  const existingNodeIds = new Set(graphData.nodes.map((n) => n.id));

  // First pass: Add all nodes
  analysis.graph.forEach((item) => {
    if (item.node) {
      const nodeId = `${parseNode.id}-${analysisIndex}-${item.node.pada}`;

      // Only add if not already in the graph (using Set for O(1) lookup)
      if (!existingNodeIds.has(nodeId)) {
        const parentId = item.predecessor
          ? `${parseNode.id}-${analysisIndex}-${item.predecessor.pada}`
          : undefined;

        const graphNode = createNode({
          id: nodeId,
          parentId,
          // dragHandle:
          //   item.node.tags && item.node.tags.length > 1
          //     ? ".drag-handle__custom"
          //     : undefined,
          data: {
            label: item.node.pada,
            ...item,
            subTitle: item.node.root,
            tags: item.node.tags,
          },
        });
        graphData.nodes.push(graphNode);
        existingNodeIds.add(nodeId);
      }
    }
  });

  // Second pass: Add all edges
  analysis.graph.forEach((item: any) => {
    if (item.node) {
      addGraphEdges(item, analysisIndex, parseNode, graphData);
    }
  });
}

/**
 * Adds edges for a graph item.
 *
 * @param item - Graph item to add edges for
 * @param analysisIndex - Index of the analysis
 * @param parseNode - Parent parse node
 * @param graphData - Graph data to add edges to
 */
function addGraphEdges(
  item: any,
  analysisIndex: number,
  parseNode: Node,
  graphData: GraphData,
): void {
  const nodeId = `${parseNode.id}-${analysisIndex}-${item.node.pada}`;

  if (item.predecessor) {
    // Add edge between this node and its predecessor
    const predecessorId = `${parseNode.id}-${analysisIndex}-${item.predecessor.pada}`;
    const relationLabel = item.relation || "";

    graphData.edges.push(
      createEdge({
        source: predecessorId,
        target: nodeId,
        data: {
          label: relationLabel,
          ...item,
        },
      }),
    );
  } else {
    // Connect to parse node as root
    graphData.edges.push(
      createEdge({
        source: parseNode.id,
        target: nodeId,
        data: {
          label: `analysis ${analysisIndex + 1}`,
          ...item,
        },
      }),
    );
  }
}

/**
 * Organizes nodes in hierarchical order to ensure parents are processed first.
 * Uses topological sorting for better visualization.
 *
 * @param graphData - Graph data to organize
 */
function organizeNodesHierarchically(graphData: GraphData): void {
  const sortedNodes: Node[] = [];
  const nodeMap = new Map(graphData.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();

  // Recursive function for depth-first traversal
  const addNodeWithParents = (nodeId: string): void => {
    if (visited.has(nodeId)) return;

    const node = nodeMap.get(nodeId);
    if (!node) return;

    // Process parent first (topological sort)
    if (node.parentId && nodeMap.has(node.parentId)) {
      addNodeWithParents(node.parentId);
    }

    // Add current node if not already added
    if (!visited.has(nodeId)) {
      sortedNodes.push(node);
      visited.add(nodeId);
    }
  };

  // First pass: Add all root nodes (nodes without parents)
  graphData.nodes.forEach((node) => {
    if (!node.parentId) {
      addNodeWithParents(node.id);
    }
  });

  // Second pass: Add any remaining nodes (in case of orphaned nodes)
  graphData.nodes.forEach((node) => {
    addNodeWithParents(node.id);
  });

  // Replace nodes with sorted version
  graphData.nodes = sortedNodes;
}

/**
 * Ensures all nodes have proper parent relationships.
 *
 * @param graphData - Graph data to process
 * @param parseNode - Parent parse node
 */
function ensureNodeParenting(graphData: GraphData, parseNode: Node): void {
  graphData.nodes.forEach((node) => {
    if (!node.parentId && node.id !== parseNode.id) {
      // node.parentId = parseNode.id;
    }
  });
}

/**
 * Connects a node to a parent via an edge.
 *
 * @param graphData - Graph data to add edge to
 * @param parentId - ID of parent node
 * @param targetId - ID of target node
 * @param label - Optional label for the edge
 * @returns void
 */
export function connectToParent({
  graphData,
  parentId,
  targetId,
  label,
}: {
  graphData: GraphData;
  parentId: string;
  targetId: string;
  label?: string;
}): void {
  graphData.edges.push(
    createEdge({
      source: parentId,
      target: targetId,
      label,
    }),
  );
}

/**
 * Merges multiple graph data objects into a single graph.
 *
 * @param targetGraph - Target graph to merge into
 * @param sourceGraphs - Source graphs to merge from
 */
export function mergeGraphData(
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
export function connectOrphanNodesToParent(
  nodes: Node[],
  parentId: string,
): void {
  nodes.forEach((node) => {
    if (!node.parentId) {
      // node.parentId = parentId;
    }
  });
}

/**
 * Removes all child nodes and associated edges from a graph for a specific parent node.
 * This function recursively removes all descendants of the specified parent.
 *
 * @param parentId - ID of the parent node whose children should be removed
 * @param graphData - Graph data containing nodes and edges
 * @returns GraphData with specified children removed
 */
export function removeChildrenFromGraph(
  parentId: string,
  graphData: GraphData,
): GraphData {
  // If the graph is empty, return as is
  if (graphData.nodes.length === 0) {
    return { ...graphData };
  }

  // Create a deep copy to avoid mutating the original data
  const result: GraphData = {
    nodes: [...graphData.nodes],
    edges: [...graphData.edges],
  };

  // Find all descendant node IDs (direct and indirect children)
  const nodesToRemove = new Set<string>();

  // Helper function to recursively collect all descendants
  const collectDescendants = (pId: string) => {
    // Find all direct children
    const directChildren = result.nodes.filter((node) => node.parentId === pId);

    // Process each direct child
    directChildren.forEach((child) => {
      nodesToRemove.add(child.id);
      // Recursively collect this child's descendants
      collectDescendants(child.id);
    });

    // get child nodes based on edges
    getChildNodes(pId, result.nodes, result.edges).forEach((child) => {
      nodesToRemove.add(child.id);
      // Recursively collect this child's descendants
      collectDescendants(child.id);
    });
  };

  // Start collecting from the specified parent
  collectDescendants(parentId);

  // Remove all identified nodes
  result.nodes = result.nodes.filter((node) => !nodesToRemove.has(node.id));

  // Remove all edges connected to any removed node
  result.edges = result.edges.filter(
    (edge) =>
      !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target),
  );

  return result;
}

/**
 * Creates an edge between two nodes.
 *
 * @param id - Edge ID (automatically generated if not provided)
 * @param source - Source node ID
 * @param target - Target node ID
 * @param label - Label for the edge
 * @param data - Additional data to store with the edge
 * @returns Edge object
 */
export function createEdge({
  id,
  source,
  target,
  label,
  data,
}: {
  id?: string;
  source: string;
  target: string;
  label?: string;
  data?: {
    label?: string;
    startLabel?: string;
    endLabel?: string;
    [key: string]: any;
  };
}): Edge {
  return {
    id: id || `${source}-${target}`,
    source,
    target,
    label,
    data,
    type: "sansPlay",
    markerEnd: { type: MarkerType.ArrowClosed },
  } satisfies Edge;
}

/**
 * Consolidates multiple SentenceParseResults into a single unique tree structure.
 * Compares each graph item across all analyses and creates a unified representation
 * preserving unique relationships while eliminating duplicates.
 *
 * @param parseResults - Array of parse results to consolidate
 * @returns A single SentenceParseResult containing a unified tree structure
 */
export function consolidateParseResults(
  parseResults: SentenceParseResult[],
): SentenceParseResult {
  // If no results or only one result, return as-is
  if (!parseResults || parseResults.length === 0) {
    return { analysis: [] };
  }

  if (parseResults.length === 1) {
    return parseResults[0];
  }

  // Initialize the consolidated result
  const consolidatedResult: SentenceParseResult = {
    analysis: [],
  };

  // Create a map to track unique node combinations based on their relationships
  const uniqueRelationMap = new Map<string, SentenceParseGraph>(); // Process each parse result
  parseResults.forEach((parseResult) => {
    // Skip results without analysis
    if (!parseResult.analysis || parseResult.analysis.length === 0) {
      return;
    }

    // Process each analysis in the result
    parseResult.analysis.forEach((analysis) => {
      // Skip analyses without graph data
      if (!analysis.graph || analysis.graph.length === 0) {
        return;
      }

      // Process each graph item
      analysis.graph.forEach((graphItem) => {
        // Create a unique key based on node pada, predecessor pada, and relation
        // Also include node tags to distinguish different grammatical roles
        const nodePada = graphItem.node.pada;
        const nodeTags = graphItem.node.tags
          ? graphItem.node.tags.join("_")
          : "";
        const predecessorPada = graphItem.predecessor
          ? graphItem.predecessor.pada
          : "ROOT";
        const relation = graphItem.relation || "NONE";

        // Create a unique relationship key that focuses on the grammatical relationship
        const relationshipKey = `${nodePada}|${nodeTags}|${predecessorPada}|${relation}`;

        // Check if this is a more comprehensive analysis of an existing relationship
        if (
          !uniqueRelationMap.has(relationshipKey) ||
          // If the existing item has less tag information, replace it with this more detailed one
          (uniqueRelationMap.get(relationshipKey)?.node.tags?.length || 0) <
            (graphItem.node.tags?.length || 0)
        ) {
          uniqueRelationMap.set(relationshipKey, graphItem);
        }
      });
    });
  });

  // Convert the unique relations back to a graph structure
  const uniqueGraphItems = Array.from(uniqueRelationMap.values());

  // Sort graph items to ensure predecessors come before their children
  // This creates a more logical tree structure
  const sortedGraphItems = sortGraphItemsHierarchically(uniqueGraphItems);

  // Add the consolidated graph to the result
  consolidatedResult.analysis = [{ graph: sortedGraphItems }];

  return consolidatedResult;
}

/**
 * Sorts graph items hierarchically to ensure a proper tree structure.
 * Puts predecessors before their children.
 *
 * @param graphItems - Unsorted graph items
 * @returns Sorted array of graph items
 */
function sortGraphItemsHierarchically(
  graphItems: SentenceParseGraph[],
): SentenceParseGraph[] {
  // Create a map of nodes by their pada text for quick lookup
  const nodeMap = new Map<string, SentenceParseGraph>();

  // Track node relationships: pada -> predecessor pada with relation
  const nodeRelationships = new Map<
    string,
    { predecessorPada: string; relation: string }[]
  >();

  // Track nodes without predecessors (root nodes)
  const rootNodes: SentenceParseGraph[] = [];

  // First pass: Identify root nodes and build node maps
  graphItems.forEach((item) => {
    const nodePada = item.node.pada;
    nodeMap.set(nodePada, item);

    // Track relationships for each node
    if (item.predecessor) {
      const predecessorPada = item.predecessor.pada;
      const relation = item.relation || "NONE";

      if (!nodeRelationships.has(nodePada)) {
        nodeRelationships.set(nodePada, []);
      }

      nodeRelationships.get(nodePada)?.push({
        predecessorPada,
        relation,
      });
    } else {
      rootNodes.push(item);
    }
  });

  // Result array for sorted items
  const sortedItems: SentenceParseGraph[] = [];

  // Set to track visited nodes by pada
  const visited = new Set<string>();

  // Recursive function to traverse the graph depth-first
  const visitNode = (item: SentenceParseGraph) => {
    const nodePada = item.node.pada;

    // Skip if already visited
    if (visited.has(nodePada)) {
      return;
    }

    // If this node has a predecessor, visit the predecessor first
    if (item.predecessor) {
      const predecessorPada = item.predecessor.pada;
      const predecessorItem = nodeMap.get(predecessorPada);
      if (predecessorItem && !visited.has(predecessorPada)) {
        visitNode(predecessorItem);
      }
    }

    // Mark as visited and add to result
    visited.add(nodePada);
    sortedItems.push(item);

    // Find and visit all children of this node
    graphItems.forEach((childItem) => {
      if (childItem.predecessor && childItem.predecessor.pada === nodePada) {
        if (!visited.has(childItem.node.pada)) {
          visitNode(childItem);
        }
      }
    });
  };

  // Start traversal from root nodes
  rootNodes.forEach(visitNode);

  // Handle any nodes not visited (might be in a cycle or orphaned)
  graphItems.forEach((item) => {
    if (!visited.has(item.node.pada)) {
      visitNode(item);
    }
  });

  return sortedItems;
}

"use client";

import { Edge, Node } from "@xyflow/react";

export interface HierarchyOptions {
  nodeWidth: number;
  nodeHeight: number;
  nodeSpacingX: number;
  nodeSpacingY: number;
}

/**
 * Utility logger for hierarchy layout operations
 */
export function logNodeOperation(
  operation: string,
  nodeInfo: any,
  extra?: any,
) {
  console.log(
    `%c[${operation}]%c ${nodeInfo.id || "unknown"} (${nodeInfo.label || "N/A"})`,
    "color: #4caf50; font-weight: bold",
    "color: inherit",
    { ...nodeInfo, ...extra },
  );
}

/**
 * Gets the child nodes of a parent node based on the edges
 */
export function getChildNodes(
  parentId: string,
  nodes: Node[],
  edges: Edge[],
): Node[] {
  // Find all edges where the source is the parent
  const childEdges = edges.filter((edge) => edge.source === parentId);

  // Get the target nodes from these edges
  return childEdges
    .map((edge) => nodes.find((node) => node.id === edge.target))
    .filter(Boolean) as Node[];
}

/**
 * Gets the width of a node, using measured width if available or default width
 */
export function getNodeWidth(node: Node, defaultWidth: number): number {
  return node.measured?.width || defaultWidth;
}

/**
 * Gets the height of a node, using measured height if available or default height
 */
export function getNodeHeight(node: Node, defaultHeight: number): number {
  return node.measured?.height || defaultHeight;
}

/**
 * Calculates the right edge position of a node
 */
export function getNodeRightEdge(
  node: Node,
  options: HierarchyOptions,
): number {
  return node.position.x + getNodeWidth(node, options.nodeWidth);
}

/**
 * Finds the leftmost node's X position from a collection of nodes
 */
export function findLeftmostNodeX(nodes: Node[]): number {
  return nodes.reduce((min, node) => Math.min(min, node.position.x), Infinity);
}

/**
 * Finds the rightmost edge of nodes, considering node widths
 */
export function findRightmostNodeEdge(
  nodes: Node[],
  options: HierarchyOptions,
): number {
  return nodes.reduce(
    (max, node) => Math.max(max, getNodeRightEdge(node, options)),
    -Infinity,
  );
}

/**
 * Calculates the center position between leftmost and rightmost nodes
 */
export function calculateCenterX(leftX: number, rightX: number): number {
  return leftX + (rightX - leftX) / 2;
}

/**
 * Centers a parent node above its children
 */
export function centerNodeOverChildren(
  parentNode: Node,
  childNodes: Node[],
  options: HierarchyOptions,
): Node {
  if (childNodes.length === 0) return parentNode;

  const leftmostChildX = findLeftmostNodeX(childNodes);
  const rightmostChildEdge = findRightmostNodeEdge(childNodes, options);
  const childrenCenter = calculateCenterX(leftmostChildX, rightmostChildEdge);
  const parentWidth = getNodeWidth(parentNode, options.nodeWidth);

  const newX = childrenCenter - parentWidth / 2;

  console.log(
    `[centerNodeOverChildren] ${parentNode.data?.label || parentNode.id || "N/A"}, childCount=${childNodes.length}, left=${leftmostChildX}, right=${rightmostChildEdge}, center=${childrenCenter}, newX=${newX}`,
  );

  return {
    ...parentNode,
    position: {
      x: newX,
      y: parentNode.position.y,
    },
  };
}

/**
 * Calculates the rightmost X position in a subtree including parent and all descendants
 */
export function calculateSubtreeRightmostX(
  parentNode: Node,
  childNodes: Node[],
  grandchildrenMap: Map<string, Node[]>,
  options: HierarchyOptions,
): number {
  let rightmostX = getNodeRightEdge(parentNode, options);

  // Check all children
  childNodes.forEach((child) => {
    const childRightEdge = getNodeRightEdge(child, options);
    if (childRightEdge > rightmostX) {
      rightmostX = childRightEdge;
      console.log(
        `[calculateSubtreeRightmostX] New rightmost from child: ${child.data?.label || child.id || "N/A"}, rightEdge=${childRightEdge}`,
      );
    }

    // Check all grandchildren
    const grandchildren = grandchildrenMap.get(child.id) || [];
    grandchildren.forEach((gc) => {
      const gcRightEdge = getNodeRightEdge(gc, options);
      if (gcRightEdge > rightmostX) {
        rightmostX = gcRightEdge;
        console.log(
          `[calculateSubtreeRightmostX] New rightmost from grandchild: ${gc.data?.label || gc.id || "N/A"}, rightEdge=${gcRightEdge}`,
        );
      }
    });
  });

  console.log(
    `[calculateSubtreeRightmostX] Final rightmost for parent: ${parentNode.data?.label || parentNode.id || "N/A"}, rightmostX=${rightmostX}`,
  );
  return rightmostX;
}

/**
 * Positions a child node above a single grandchild
 */
export function positionNodeAboveSingleChild(
  childNode: Node,
  grandchild: Node,
  options: HierarchyOptions,
): Node {
  const childWidth = getNodeWidth(childNode, options.nodeWidth);
  const grandchildWidth = getNodeWidth(grandchild, options.nodeWidth);

  const newX = grandchild.position.x + (grandchildWidth - childWidth) / 2;

  console.log(
    `[positionNodeAboveSingleChild] ${childNode.data?.label || childNode.id || "N/A"}, grandchildId=${grandchild.data?.label || grandchild.id}, newX=${newX}, oldX=${childNode.position.x}`,
  );

  return {
    ...childNode,
    position: {
      x: newX,
      y: childNode.position.y,
    },
  };
}

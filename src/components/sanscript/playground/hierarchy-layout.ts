import { Edge, Node } from "@xyflow/react";
import {
  HierarchyOptions,
  getChildNodes,
  centerNodeOverChildren,
  calculateSubtreeRightmostX,
  positionNodeAboveSingleChild,
  getNodeWidth,
  getNodeHeight,
  getNodeRightEdge,
  findLeftmostNodeX,
  findRightmostNodeEdge,
  calculateCenterX,
  logNodeOperation,
} from "./hierarchy-utils";

// Export the console log flag to be easily disabled
export const ENABLE_HIERARCHY_DEBUG_LOGS = true;

const defaultOptions: HierarchyOptions = {
  nodeWidth: 172,
  nodeHeight: 70,
  nodeSpacingX: 20,
  nodeSpacingY: 20,
};

export function getHierarchicalLayout({
  nodes,
  edges,
  options,
}: {
  nodes: Node[];
  edges: Edge[];
  options?: Partial<HierarchyOptions>;
}): { nodes: Node[]; edges: Edge[] } {
  const visitedNodes = new Map<string, Node>();
  const derivedOptions: HierarchyOptions = {
    ...defaultOptions,
    ...options,
  };

  // Starting horizontal position for each tree
  let startX = 0;
  let startY = 0;
  const horizontalGap = 50; // Gap between separate trees

  // Find root nodes (nodes that aren't targets in any edge)
  const targetNodeIds = new Set(edges.map((edge) => edge.target));
  const rootNodes = nodes.filter((node) => !targetNodeIds.has(node.id));

  // Process each root node as a separate tree
  rootNodes.forEach((rootNode) => {
    if (visitedNodes.has(rootNode.id)) {
      return;
    }

    // Set the starting position for the root node
    startX = rootNode.position?.x || 0;
    startY = rootNode.position?.y || 0;

    // Set the root node position
    const updatedRootNode = {
      ...rootNode,
      position: { x: startX, y: startY },
    };

    logNodeOperation("Root Node Position", {
      id: rootNode.id,
      label: rootNode.data?.label || "N/A",
      oldPos: `(${rootNode.position?.x || "undefined"},${rootNode.position?.y || "undefined"})`,
      newPos: `(${startX},${startY})`,
    });

    // Add the root node to visited nodes
    visitedNodes.set(rootNode.id, updatedRootNode);

    // Recursively position all descendants
    const finalPosition = traverseGraphDepthFirst(
      updatedRootNode,
      nodes,
      edges,
      visitedNodes,
      startX,
      startY,
      derivedOptions,
    );

    // Get immediate children to adjust parent position
    const childrenNodes = getChildNodes(rootNode.id, nodes, edges)
      .map((child) => visitedNodes.get(child.id))
      .filter(Boolean) as Node[];

    // Center parent over children if there are any
    if (childrenNodes.length > 0) {
      // Update the root node to be centered over its children
      const centeredRootNode = centerNodeOverChildren(
        updatedRootNode,
        childrenNodes,
        derivedOptions,
      );
      console.log(
        `[Center Root] ${rootNode.data?.label || rootNode.id || "N/A"}, oldPos=(${updatedRootNode.position.x},${updatedRootNode.position.y}), newPos=(${centeredRootNode.position.x},${centeredRootNode.position.y})`,
      );
      visitedNodes.set(rootNode.id, centeredRootNode);

      // Find the rightmost edge position among children
      const furthestRightX = findRightmostNodeEdge(
        childrenNodes,
        derivedOptions,
      );

      // Move the starting position for the next tree based on the rightmost child
      startX = furthestRightX + derivedOptions.nodeSpacingX * 3; // Using 3x spacing for better separation
    } else {
      // If no children, use the finalPosition from traversal
      startX = finalPosition.currentX + derivedOptions.nodeSpacingX * 3;
    }
  });

  const finalNodes = Array.from(visitedNodes.values());
  return { nodes: finalNodes, edges };
}

const traverseGraphDepthFirst = (
  parentNode: Node,
  nodes: Node[],
  edges: Edge[],
  visitedNodes: Map<string, Node>,
  currentX: number,
  currentY: number,
  options: HierarchyOptions,
): { currentX: number; currentY: number } => {
  const children = getChildNodes(parentNode.id, nodes, edges);

  if (children.length === 0) {
    // If no children, return the current position
    return { currentX, currentY };
  }

  // Start position for children is below the parent
  const parentHeight = getNodeHeight(parentNode, options.nodeHeight);

  // Position for first child should be directly below the parent
  let childStartX = parentNode.position.x;
  let childStartY = parentNode.position.y + parentHeight + options.nodeSpacingY;

  // Keep track of the rightmost position to determine where to place the next row
  let rightmostX = childStartX;

  // First pass: Position all children in a row below the parent
  children.forEach((child, index) => {
    if (visitedNodes.has(child.id)) {
      return;
    }

    const childWidth = getNodeWidth(child, options.nodeWidth);

    // If not the first child, position to the right of previous child
    if (index > 0) {
      childStartX +=
        options.nodeSpacingX +
        getNodeWidth(children[index - 1], options.nodeWidth);
    }

    // Update the node with its new position
    visitedNodes.set(child.id, {
      ...child,
      position: { x: childStartX, y: childStartY },
    });

    console.log(
      `[Child] ${child.data?.label || "N/A"}, oldPos=(${child.position?.x || "undefined"},${child.position?.y || "undefined"}), newPos=(${childStartX},${childStartY})`,
    );

    // Track the rightmost position
    rightmostX = Math.max(rightmostX, childStartX + childWidth);
  });

  // Second pass: Recursively position all children's children
  let maxChildBottomY = childStartY;

  children.forEach((child) => {
    if (!visitedNodes.has(child.id)) {
      return; // Skip if not visited (should not happen here)
    }

    // Start the child's children layout from its position
    const childNode = visitedNodes.get(child.id)!;

    const result = traverseGraphDepthFirst(
      childNode,
      nodes,
      edges,
      visitedNodes,
      childNode.position.x,
      childNode.position.y,
      options,
    );

    // Update the bottom-most position to ensure no overlap between subtrees
    maxChildBottomY = Math.max(maxChildBottomY, result.currentY);
  });

  // Third pass: Adjust each parent to be centered above its children
  const grandchildrenMap = new Map<string, Node[]>();

  children.forEach((child) => {
    if (!visitedNodes.has(child.id)) {
      return;
    }

    const childNode = visitedNodes.get(child.id)!;

    // Get child's children (grandchildren of current parent)
    const grandchildren = getChildNodes(child.id, nodes, edges)
      .map((gc) => visitedNodes.get(gc.id))
      .filter(Boolean) as Node[];

    grandchildrenMap.set(child.id, grandchildren);

    if (grandchildren.length > 1) {
      // Center parent above multiple children
      const updatedChildNode = centerNodeOverChildren(
        childNode,
        grandchildren,
        options,
      );
      console.log(
        `[Center Child] ${childNode.data?.label || child.id || "N/A"}, oldPos=(${childNode.position.x},${childNode.position.y}), newPos=(${updatedChildNode.position.x},${updatedChildNode.position.y})`,
      );
      visitedNodes.set(child.id, updatedChildNode);
    } else if (grandchildren.length === 1) {
      // Position directly above single child
      const updatedChildNode = positionNodeAboveSingleChild(
        childNode,
        grandchildren[0],
        options,
      );
      console.log(
        `[Single Child] ${childNode.data?.label || child.id || "N/A"}, oldPos=(${childNode.position.x},${childNode.position.y}), newPos=(${updatedChildNode.position.x},${updatedChildNode.position.y})`,
      );
      visitedNodes.set(child.id, updatedChildNode);
    }
  });

  // Calculate the rightmost position considering the entire subtree
  const subtreeRightmostX = calculateSubtreeRightmostX(
    parentNode,
    children.map((child) => visitedNodes.get(child.id)!).filter(Boolean),
    grandchildrenMap,
    options,
  );

  // Return the bottom-right corner of the entire subtree
  return {
    currentX: subtreeRightmostX,
    currentY: maxChildBottomY + options.nodeSpacingY,
  };
};

// To disable logs, add this line
// console.log = (...args) => {};

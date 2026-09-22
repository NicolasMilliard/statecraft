import type { Flow, FlowEdgeKind } from '@statecraft/core';

export function canAddFlowEdge(
  flow: Flow,
  sourceNodeId: string,
  targetNodeId: string,
  kind: FlowEdgeKind,
  ignoredEdgeId?: string,
): boolean {
  const sourceExists = flow.nodes.some((node) => node.id === sourceNodeId);
  const targetExists = flow.nodes.some((node) => node.id === targetNodeId);

  const alreadyExists = flow.edges.some(
    (edge) =>
      edge.id !== ignoredEdgeId &&
      edge.sourceNodeId === sourceNodeId &&
      edge.targetNodeId === targetNodeId &&
      edge.kind === kind,
  );

  return sourceExists && targetExists && !alreadyExists;
}

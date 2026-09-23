import type { FlowEditorState } from './flow-editor-state';

export function deleteFlowElements(
  editor: FlowEditorState,
  nodeIds: readonly string[],
  edgeIds: readonly string[],
): FlowEditorState {
  const { flow, layout, initialLayout } = editor;
  const deletedNodeIds = new Set(nodeIds);
  const deletedEdgeIds = new Set(edgeIds);

  const nodes = flow.nodes.filter((node) => !deletedNodeIds.has(node.id));

  const edges = flow.edges.filter(
    (edge) =>
      !deletedEdgeIds.has(edge.id) &&
      !deletedNodeIds.has(edge.sourceNodeId) &&
      !deletedNodeIds.has(edge.targetNodeId),
  );

  if (
    nodes.length === flow.nodes.length &&
    edges.length === flow.edges.length
  ) {
    return editor;
  }

  const positions = { ...layout.positions };
  const initialPositions = { ...initialLayout.positions };

  for (const nodeId of deletedNodeIds) {
    delete positions[nodeId];
    delete initialPositions[nodeId];
  }

  return {
    ...editor,
    flow: {
      ...flow,
      entryNodeId:
        flow.entryNodeId !== null && deletedNodeIds.has(flow.entryNodeId)
          ? null
          : flow.entryNodeId,
      nodes,
      edges,
      codeReferences: flow.codeReferences.filter(
        (reference) => !deletedNodeIds.has(reference.flowNodeId),
      ),
    },
    layout: {
      ...layout,
      positions,
    },
    initialLayout: {
      ...initialLayout,
      positions: initialPositions,
    },
  };
}

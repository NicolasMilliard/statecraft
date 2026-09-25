import {
  validateFlow,
  type Flow,
  type FlowEdgeKind,
  type FlowNodeKind,
} from '@statecraft/core';
import type { Edge, Node } from '@xyflow/react';
import type { FlowLayout } from './flow-layout';

export type CanvasNode = Node<
  {
    label: string;
    kind: FlowNodeKind;
    isEntry: boolean;
  },
  'statecraft'
>;

export type CanvasEdge = Edge<{ kind: FlowEdgeKind }, 'statecraft'>;

export const CANVAS_NODE_WIDTH = 192;
export const CANVAS_NODE_MIN_HEIGHT = 80;

export function toReactFlowGraph(
  flow: Flow,
  layout: FlowLayout,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const issues = validateFlow(flow);

  if (issues.length > 0) {
    throw new Error(
      `Invalid flow "${flow.id}": ${issues.map((issue) => issue.code).join(', ')}`,
    );
  }

  if (layout.flowId !== flow.id) {
    throw new Error(`Layout does not belong to flow "${flow.id}"`);
  }

  const nodes = flow.nodes.map((node): CanvasNode => {
    const position = layout.positions[node.id];

    if (position === undefined) {
      throw new Error(`Missing position for node "${node.id}"`);
    }

    const isEntry = node.id === flow.entryNodeId;

    return {
      id: node.id,
      type: 'statecraft',
      ariaLabel: `${node.label}, ${node.kind}${isEntry ? ', entry point' : ''}`,
      position: { ...position },
      style: { width: CANVAS_NODE_WIDTH, minHeight: CANVAS_NODE_MIN_HEIGHT },
      data: {
        label: node.label,
        kind: node.kind,
        isEntry,
      },
    };
  });

  const nodeLabels = new Map(flow.nodes.map((node) => [node.id, node.label]));

  const edges = flow.edges.map((edge): CanvasEdge => {
    const sourceLabel = nodeLabels.get(edge.sourceNodeId) ?? edge.sourceNodeId;
    const targetLabel = nodeLabels.get(edge.targetNodeId) ?? edge.targetNodeId;

    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: 'statecraft',
      selectable: true,
      focusable: true,
      ariaLabel: `${sourceLabel} to ${targetLabel}, ${edge.kind}`,
      data: { kind: edge.kind },
    };
  });

  return { nodes, edges };
}

import {
  validateFlow,
  type Flow,
  type FlowEdgeKind,
  type FlowNodeKind,
} from '@statecraft/core';
import { MarkerType, Position, type Edge, type Node } from '@xyflow/react';
import type { FlowLayout } from './flow-layout';

export type CanvasNode = Node<
  {
    label: string;
    kind: FlowNodeKind;
  },
  'default'
>;

const EDGE_COLORS: Record<FlowEdgeKind, string> = {
  transition: '#64748b',
  success: '#15803d',
  failure: '#b91c1c',
};

export function toReactFlowGraph(
  flow: Flow,
  layout: FlowLayout,
): { nodes: CanvasNode[]; edges: Edge[] } {
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
      type: 'default',
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      className: isEntry
        ? `statecraft-node--${node.kind} statecraft-node--entry`
        : `statecraft-node--${node.kind}`,
      ariaLabel: isEntry ? `${node.label}, entry point` : node.label,
      position: { ...position },
      data: {
        label: node.label,
        kind: node.kind,
      },
    };
  });

  const nodeLabels = new Map(flow.nodes.map((node) => [node.id, node.label]));

  const edges = flow.edges.map((edge): Edge => {
    const color = EDGE_COLORS[edge.kind];
    const sourceLabel = nodeLabels.get(edge.sourceNodeId) ?? edge.sourceNodeId;
    const targetLabel = nodeLabels.get(edge.targetNodeId) ?? edge.targetNodeId;

    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: 'smoothstep',
      selectable: true,
      focusable: true,
      ariaLabel: `${sourceLabel} to ${targetLabel}, ${edge.kind}`,
      label: edge.kind === 'transition' ? '' : edge.kind,
      style: {
        stroke: color,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
      },
    };
  });

  return { nodes, edges };
}

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

    return {
      id: node.id,
      type: 'default',
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      className: `statecraft-node--${node.kind}`,
      position: { ...position },
      data: {
        label: node.label,
        kind: node.kind,
      },
    };
  });

  const edges = flow.edges.map((edge): Edge => {
    const color = EDGE_COLORS[edge.kind];

    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: 'smoothstep',
      label: edge.kind === 'transition' ? '' : edge.kind,
      style: {
        stroke: color,
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
      },
    };
  });

  return { nodes, edges };
}

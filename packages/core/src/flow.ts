import type { CodeReference } from './code-reference.js';

export const FLOW_NODE_KINDS = [
  'screen',
  'ui',
  'action',
  'service',
  'state',
] as const;

export type FlowNodeKind = (typeof FLOW_NODE_KINDS)[number];

export const FLOW_EDGE_KINDS = ['transition', 'success', 'failure'] as const;

export type FlowEdgeKind = (typeof FLOW_EDGE_KINDS)[number];

export interface FlowNode {
  readonly id: string;
  readonly kind: FlowNodeKind;
  readonly label: string;
}

export interface FlowEdge {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly kind: FlowEdgeKind;
}

export interface Flow {
  readonly id: string;
  readonly name: string;
  readonly entryNodeId: string | null;
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly codeReferences: readonly CodeReference[];
}

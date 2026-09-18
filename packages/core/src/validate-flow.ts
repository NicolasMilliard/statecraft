import type { Flow } from './flow.js';

export type FlowValidationIssue =
  | {
      readonly code: 'duplicate_node_id';
      readonly nodeId: string;
    }
  | {
      readonly code: 'duplicate_edge_id';
      readonly edgeId: string;
    }
  | {
      readonly code: 'entry_node_not_found';
      readonly nodeId: string;
    }
  | {
      readonly code: 'edge_source_not_found' | 'edge_target_not_found';
      readonly edgeId: string;
      readonly nodeId: string;
    };

export function validateFlow(flow: Flow): readonly FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of flow.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        code: 'duplicate_node_id',
        nodeId: node.id,
      });
    }

    nodeIds.add(node.id);
  }

  if (flow.entryNodeId !== null && !nodeIds.has(flow.entryNodeId)) {
    issues.push({
      code: 'entry_node_not_found',
      nodeId: flow.entryNodeId,
    });
  }

  for (const edge of flow.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        code: 'duplicate_edge_id',
        edgeId: edge.id,
      });
    }

    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.sourceNodeId)) {
      issues.push({
        code: 'edge_source_not_found',
        edgeId: edge.id,
        nodeId: edge.sourceNodeId,
      });
    }

    if (!nodeIds.has(edge.targetNodeId)) {
      issues.push({
        code: 'edge_target_not_found',
        edgeId: edge.id,
        nodeId: edge.targetNodeId,
      });
    }
  }

  return issues;
}

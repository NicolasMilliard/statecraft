import { FLOW_NODE_KINDS, type FlowNodeKind } from '@statecraft/core';

export const NODE_KIND_MIME_TYPE = 'application/x-statecraft-node-kind';

export function parseDraggedNodeKind(value: string): FlowNodeKind | null {
  return FLOW_NODE_KINDS.find((kind) => kind === value) ?? null;
}

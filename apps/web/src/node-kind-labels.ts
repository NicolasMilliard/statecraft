import type { FlowNodeKind } from '@statecraft/core';

export const NODE_KIND_LABELS: Record<FlowNodeKind, string> = {
  screen: 'Screen',
  ui: 'UI',
  action: 'Action',
  service: 'Service',
  state: 'State',
};

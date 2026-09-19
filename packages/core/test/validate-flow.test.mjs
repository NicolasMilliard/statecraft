import { validateFlow } from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createFlow() {
  return {
    id: 'checkout',
    name: 'Checkout',
    entryNodeId: 'order',
    nodes: [
      { id: 'order', kind: 'service', label: 'POST /orders' },
      { id: 'success', kind: 'state', label: 'Success' },
      { id: 'failure', kind: 'state', label: 'Failure' },
    ],
    edges: [
      {
        id: 'success-path',
        sourceNodeId: 'order',
        targetNodeId: 'success',
        kind: 'success',
      },
      {
        id: 'failure-path',
        sourceNodeId: 'order',
        targetNodeId: 'failure',
        kind: 'failure',
      },
    ],
    codeReferences: [],
  };
}

test('accepts a consistent flow with success and failure branches', () => {
  assert.deepEqual(validateFlow(createFlow()), []);
});

test('accepts an empty draft', () => {
  const flow = {
    ...createFlow(),
    entryNodeId: null,
    nodes: [],
    edges: [],
  };

  assert.deepEqual(validateFlow(flow), []);
});

test('accepts a draft with nodes but no entry point or edges', () => {
  const flow = {
    ...createFlow(),
    entryNodeId: null,
    edges: [],
  };

  assert.deepEqual(validateFlow(flow), []);
});

test('reports duplicate node and edge identifiers', () => {
  const flow = createFlow();

  const issues = validateFlow({
    ...flow,
    nodes: [...flow.nodes, flow.nodes[0]],
    edges: [...flow.edges, flow.edges[0]],
  });

  assert.deepEqual(issues, [
    { code: 'duplicate_node_id', nodeId: 'order' },
    { code: 'duplicate_edge_id', edgeId: 'success-path' },
  ]);
});

test('reports an entry point referencing a missing node', () => {
  const flow = {
    ...createFlow(),
    entryNodeId: 'missing',
  };

  assert.deepEqual(validateFlow(flow), [
    { code: 'entry_node_not_found', nodeId: 'missing' },
  ]);
});

test('reports both missing endpoints of an edge', () => {
  const flow = {
    ...createFlow(),
    edges: [
      {
        id: 'broken-edge',
        sourceNodeId: 'missing-source',
        targetNodeId: 'missing-target',
        kind: 'transition',
      },
    ],
  };

  assert.deepEqual(validateFlow(flow), [
    {
      code: 'edge_source_not_found',
      edgeId: 'broken-edge',
      nodeId: 'missing-source',
    },
    {
      code: 'edge_target_not_found',
      edgeId: 'broken-edge',
      nodeId: 'missing-target',
    },
  ]);
});

test('accepts cycles and disconnected nodes', () => {
  const flow = createFlow();

  const issues = validateFlow({
    ...flow,
    nodes: [...flow.nodes, { id: 'sidebar', kind: 'ui', label: 'Sidebar' }],
    edges: [
      ...flow.edges,
      {
        id: 'retry',
        sourceNodeId: 'failure',
        targetNodeId: 'order',
        kind: 'transition',
      },
    ],
  });

  assert.deepEqual(issues, []);
});

test('does not modify the input flow', () => {
  const flow = createFlow();
  const before = structuredClone(flow);

  validateFlow(flow);

  assert.deepEqual(flow, before);
});

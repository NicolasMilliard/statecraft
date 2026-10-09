import {
  runScenario,
  type Flow,
  type Scenario,
  type ScenarioOverride,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createCheckoutFlow(): Flow {
  return {
    id: 'checkout',
    name: 'Checkout',
    entryNodeId: 'screen',
    nodes: [
      { id: 'screen', kind: 'screen', label: 'Checkout' },
      { id: 'form', kind: 'ui', label: 'Payment form' },
      { id: 'submit', kind: 'action', label: 'Submit order' },
      { id: 'order', kind: 'service', label: 'POST /orders' },
      { id: 'confirmed', kind: 'state', label: 'Order confirmed' },
      { id: 'error', kind: 'state', label: 'Order error' },
    ],
    edges: [
      { id: 'screen-form', sourceNodeId: 'screen', targetNodeId: 'form', kind: 'transition' },
      { id: 'form-submit', sourceNodeId: 'form', targetNodeId: 'submit', kind: 'transition' },
      { id: 'submit-order', sourceNodeId: 'submit', targetNodeId: 'order', kind: 'transition' },
      { id: 'order-success', sourceNodeId: 'order', targetNodeId: 'confirmed', kind: 'success' },
      { id: 'order-failure', sourceNodeId: 'order', targetNodeId: 'error', kind: 'failure' },
    ],
    codeReferences: [],
  };
}

function createScenario(overrides: readonly ScenarioOverride[] = []): Scenario {
  return { id: 'checkout-default', flowId: 'checkout', name: 'Default', overrides };
}

test('runs Checkout to confirmation with an explicit simulation default', () => {
  const flow = createCheckoutFlow();
  const scenario = createScenario();
  const before = structuredClone({ flow, scenario });

  const result = runScenario(flow, scenario);

  assert.deepEqual(result, {
    status: 'completed',
    trace: {
      nodeIds: ['screen', 'form', 'submit', 'order', 'confirmed'],
      edgeIds: ['screen-form', 'form-submit', 'submit-order', 'order-success'],
      serviceOutcomes: [{
        flowNodeId: 'order',
        outcome: { kind: 'success', code: null, httpStatus: null },
        source: 'default',
      }],
    },
    terminalNodeId: 'confirmed',
  });
  assert.deepEqual({ flow, scenario }, before);
  assert.deepEqual(runScenario({ ...flow, edges: [...flow.edges].reverse() }, scenario), result);
});

test('uses a failure override and preserves its outcome details in the trace', () => {
  const scenario = createScenario([{
    flowNodeId: 'order',
    outcome: { kind: 'failure', code: 'PAYMENT_DECLINED', httpStatus: 402 },
  }]);

  assert.deepEqual(runScenario(createCheckoutFlow(), scenario), {
    status: 'completed',
    trace: {
      nodeIds: ['screen', 'form', 'submit', 'order', 'error'],
      edgeIds: ['screen-form', 'form-submit', 'submit-order', 'order-failure'],
      serviceOutcomes: [{
        flowNodeId: 'order',
        outcome: { kind: 'failure', code: 'PAYMENT_DECLINED', httpStatus: 402 },
        source: 'override',
      }],
    },
    terminalNodeId: 'error',
  });
});

test('refuses structurally invalid Flow and Scenario inputs before traversal', () => {
  const flow = createCheckoutFlow();

  assert.deepEqual(runScenario({ ...flow, entryNodeId: 'missing' }, createScenario()), {
    status: 'stopped',
    trace: { nodeIds: [], edgeIds: [], serviceOutcomes: [] },
    reason: {
      code: 'invalid_flow',
      issues: [{ code: 'entry_node_not_found', nodeId: 'missing' }],
    },
  });

  assert.deepEqual(runScenario(flow, createScenario([{
    flowNodeId: 'form',
    outcome: { kind: 'failure', code: null, httpStatus: null },
  }])), {
    status: 'stopped',
    trace: { nodeIds: [], edgeIds: [], serviceOutcomes: [] },
    reason: {
      code: 'invalid_scenario',
      issues: [{ code: 'override_node_not_service', nodeId: 'form', overrideIndex: 0 }],
    },
  });
});

test('reports a missing entry point without traversing the Flow', () => {
  assert.deepEqual(runScenario(
    { ...createCheckoutFlow(), entryNodeId: null },
    createScenario(),
  ), {
    status: 'stopped',
    trace: { nodeIds: [], edgeIds: [], serviceOutcomes: [] },
    reason: { code: 'missing_entry' },
  });
});

test('reports a missing branch instead of following a different outcome', () => {
  const flow = createCheckoutFlow();
  const withoutSuccess = {
    ...flow,
    edges: flow.edges.filter((edge) => edge.id !== 'order-success'),
  };

  assert.deepEqual(runScenario(withoutSuccess, createScenario()), {
    status: 'stopped',
    trace: {
      nodeIds: ['screen', 'form', 'submit', 'order'],
      edgeIds: ['screen-form', 'form-submit', 'submit-order'],
      serviceOutcomes: [{
        flowNodeId: 'order',
        outcome: { kind: 'success', code: null, httpStatus: null },
        source: 'default',
      }],
    },
    reason: { code: 'missing_branch', nodeId: 'order', expectedEdgeKind: 'success' },
  });
});

test('requires transition edges at non-Service nodes', () => {
  const flow = createCheckoutFlow();
  const wrongKind: Flow = {
    ...flow,
    edges: flow.edges.map((edge) =>
      edge.id === 'screen-form' ? { ...edge, kind: 'success' } : edge,
    ),
  };

  assert.deepEqual(runScenario(wrongKind, createScenario()), {
    status: 'stopped',
    trace: { nodeIds: ['screen'], edgeIds: [], serviceOutcomes: [] },
    reason: { code: 'missing_branch', nodeId: 'screen', expectedEdgeKind: 'transition' },
  });
});

test('allows a Service with no outgoing edges to be terminal', () => {
  const flow = createCheckoutFlow();
  const terminalService: Flow = {
    ...flow,
    edges: flow.edges.filter((edge) => edge.sourceNodeId !== 'order'),
  };

  const result = runScenario(terminalService, createScenario());
  assert.equal(result.status, 'completed');
  if (result.status === 'completed') {
    assert.equal(result.terminalNodeId, 'order');
    assert.deepEqual(result.trace.serviceOutcomes, [{
      flowNodeId: 'order',
      outcome: { kind: 'success', code: null, httpStatus: null },
      source: 'default',
    }]);
  }
});

test('reports ambiguous reachable branches but ignores ambiguity off the path', () => {
  const flow = createCheckoutFlow();
  const extraSuccess = {
    id: 'order-other-success',
    sourceNodeId: 'order',
    targetNodeId: 'error',
    kind: 'success' as const,
  };
  const ambiguousFlow = { ...flow, edges: [...flow.edges, extraSuccess] };
  const failureScenario = createScenario([{
    flowNodeId: 'order',
    outcome: { kind: 'failure', code: null, httpStatus: null },
  }]);

  assert.deepEqual(runScenario(ambiguousFlow, createScenario()), {
    status: 'stopped',
    trace: {
      nodeIds: ['screen', 'form', 'submit', 'order'],
      edgeIds: ['screen-form', 'form-submit', 'submit-order'],
      serviceOutcomes: [{
        flowNodeId: 'order',
        outcome: { kind: 'success', code: null, httpStatus: null },
        source: 'default',
      }],
    },
    reason: { code: 'ambiguous_branch', nodeId: 'order', expectedEdgeKind: 'success' },
  });

  const failureResult = runScenario(ambiguousFlow, failureScenario);
  assert.equal(failureResult.status, 'completed');
  if (failureResult.status === 'completed') {
    assert.equal(failureResult.terminalNodeId, 'error');
  }
});

test('stops at the first repeated node and includes the closing edge', () => {
  const flow = createCheckoutFlow();
  const cyclicFlow: Flow = {
    ...flow,
    edges: [
      ...flow.edges,
      { id: 'confirmed-screen', sourceNodeId: 'confirmed', targetNodeId: 'screen', kind: 'transition' },
    ],
  };

  assert.deepEqual(runScenario(cyclicFlow, createScenario()), {
    status: 'stopped',
    trace: {
      nodeIds: ['screen', 'form', 'submit', 'order', 'confirmed', 'screen'],
      edgeIds: ['screen-form', 'form-submit', 'submit-order', 'order-success', 'confirmed-screen'],
      serviceOutcomes: [{
        flowNodeId: 'order',
        outcome: { kind: 'success', code: null, httpStatus: null },
        source: 'default',
      }],
    },
    reason: { code: 'cycle', nodeId: 'screen' },
  });
});

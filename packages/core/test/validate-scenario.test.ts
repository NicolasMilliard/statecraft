import {
  validateScenario,
  type Flow,
  type Scenario,
  type ScenarioOverride,
  type ServiceOutcomeKind,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createFlow(): Flow {
  return {
    id: 'checkout',
    name: 'Checkout',
    entryNodeId: null,
    nodes: [
      { id: 'order', kind: 'service', label: 'POST /orders' },
      { id: 'payment', kind: 'service', label: 'Create payment' },
      { id: 'form', kind: 'ui', label: 'Payment form' },
    ],
    edges: [],
    codeReferences: [],
  };
}

function createOverride(
  flowNodeId: string,
  kind: ServiceOutcomeKind = 'failure',
): ScenarioOverride {
  return {
    flowNodeId,
    outcome: {
      kind,
      code: null,
      httpStatus: null,
    },
  };
}

function createScenario(overrides: readonly ScenarioOverride[]): Scenario {
  return {
    id: 'out-of-stock',
    flowId: 'checkout',
    name: 'Out of stock',
    overrides,
  };
}

test('accepts overrides targeting distinct service nodes', () => {
  const scenario = createScenario([
    {
      flowNodeId: 'order',
      outcome: {
        kind: 'failure',
        code: 'OUT_OF_STOCK',
        httpStatus: 409,
      },
    },
    createOverride('payment', 'success'),
  ]);

  assert.deepEqual(validateScenario(scenario, createFlow()), []);
});

test('allows empty scenarios and partial service overrides', () => {
  const flow = createFlow();

  const scenarios = [
    createScenario([]),
    createScenario([createOverride('order')]),
  ];

  for (const scenario of scenarios) {
    assert.deepEqual(validateScenario(scenario, flow), []);
  }
});

test('rejects another flow before checking its node references', () => {
  const scenario: Scenario = {
    ...createScenario([createOverride('missing')]),
    flowId: 'another-flow',
  };

  assert.deepEqual(validateScenario(scenario, createFlow()), [
    {
      code: 'scenario_flow_mismatch',
      expectedFlowId: 'checkout',
      actualFlowId: 'another-flow',
    },
  ]);
});

test('reports an override targeting a missing node', () => {
  const scenario = createScenario([createOverride('missing')]);

  assert.deepEqual(validateScenario(scenario, createFlow()), [
    {
      code: 'override_node_not_found',
      nodeId: 'missing',
      overrideIndex: 0,
    },
  ]);
});

test('rejects overrides targeting any non-service node kind', () => {
  const scenario = createScenario([createOverride('target')]);

  for (const kind of ['screen', 'ui', 'action', 'state'] as const) {
    const flow: Flow = {
      ...createFlow(),
      nodes: [{ id: 'target', kind, label: 'Target' }],
    };

    assert.deepEqual(
      validateScenario(scenario, flow),
      [
        {
          code: 'override_node_not_service',
          nodeId: 'target',
          overrideIndex: 0,
        },
      ],
      kind,
    );
  }
});

for (const kind of ['success', 'failure'] as const) {
  test(`rejects duplicate overrides with a ${kind} second outcome`, () => {
    const scenario = createScenario([
      createOverride('order', 'failure'),
      createOverride('order', kind),
    ]);

    assert.deepEqual(validateScenario(scenario, createFlow()), [
      {
        code: 'duplicate_override',
        nodeId: 'order',
        overrideIndex: 1,
      },
    ]);
  });
}

test('collects independent issues without modifying inputs', () => {
  const flow = createFlow();

  const scenario = createScenario([
    createOverride('order'),
    createOverride('order', 'success'),
    createOverride('missing'),
    createOverride('form'),
  ]);

  const original = structuredClone({ flow, scenario });

  assert.deepEqual(validateScenario(scenario, flow), [
    {
      code: 'duplicate_override',
      nodeId: 'order',
      overrideIndex: 1,
    },
    {
      code: 'override_node_not_found',
      nodeId: 'missing',
      overrideIndex: 2,
    },
    {
      code: 'override_node_not_service',
      nodeId: 'form',
      overrideIndex: 3,
    },
  ]);

  assert.deepEqual({ flow, scenario }, original);
});

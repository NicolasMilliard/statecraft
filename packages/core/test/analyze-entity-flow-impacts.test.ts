import {
  analyzeEntityFlowImpacts,
  type CodeChange,
  type CodeReference,
  type Flow,
  type SnapshotEntityDiff,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createFlow(
  id: string,
  entityIds: readonly string[],
  repositoryId = 'storefront',
): Flow {
  return {
    id,
    name: id,
    entryNodeId: 'payment',
    nodes: [{ id: 'payment', kind: 'ui', label: 'Payment form' }],
    edges: [],
    codeReferences: entityIds.map(
      (codeEntityId, index): CodeReference => ({
        id: `${id}-ref-${index}`,
        flowNodeId: 'payment',
        repositoryId,
        codeEntityId,
        role: index === 0 ? 'primary' : 'dependency',
      }),
    ),
  };
}

function createDiff(changes: readonly CodeChange[]): SnapshotEntityDiff {
  return {
    status: 'compared',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    changes,
  };
}

function impactsFor(flows: readonly Flow[], diff: SnapshotEntityDiff) {
  const result = analyzeEntityFlowImpacts(flows, diff);

  assert.ok(result.status === 'analyzed');

  return result.impacts;
}

test('finds all flows referencing a changed entity without mutation', () => {
  const flows = [
    createFlow('checkout', ['payment-form']),
    createFlow('update-payment', ['payment-form']),
    createFlow('profile', ['profile-form']),
    createFlow('draft', []),
  ];

  const change: CodeChange = {
    entityId: 'payment-form',
    kind: 'modified',
  };

  const diff = createDiff([change]);
  const original = structuredClone({ flows, diff });

  assert.deepEqual(analyzeEntityFlowImpacts(flows, diff), {
    status: 'analyzed',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    impacts: [
      {
        flowId: 'checkout',
        reasons: [
          {
            type: 'entity',
            referenceId: 'checkout-ref-0',
            nodeId: 'payment',
            change,
          },
        ],
      },
      {
        flowId: 'update-payment',
        reasons: [
          {
            type: 'entity',
            referenceId: 'update-payment-ref-0',
            nodeId: 'payment',
            change,
          },
        ],
      },
    ],
  });

  assert.deepEqual({ flows, diff }, original);
});

test('groups primary and dependency impacts under one flow', () => {
  const flow = createFlow('checkout', ['payment-form', 'payment-query']);

  const diff = createDiff([
    { entityId: 'payment-form', kind: 'modified' },
    { entityId: 'payment-query', kind: 'modified' },
  ]);

  const impacts = impactsFor([flow], diff);

  assert.equal(impacts.length, 1);

  const [impact] = impacts;
  assert.ok(impact);

  assert.deepEqual(
    impact.reasons.map((reason) => reason.referenceId),
    ['checkout-ref-0', 'checkout-ref-1'],
  );
});

for (const kind of ['added', 'removed'] as const) {
  test(`reports references to ${kind} entities`, () => {
    const flow = createFlow('checkout', ['payment-form']);

    const change: CodeChange = {
      entityId: 'payment-form',
      kind,
    };

    assert.deepEqual(impactsFor([flow], createDiff([change])), [
      {
        flowId: 'checkout',
        reasons: [
          {
            type: 'entity',
            referenceId: 'checkout-ref-0',
            nodeId: 'payment',
            change,
          },
        ],
      },
    ]);
  });
}

test('ignores matching entity IDs from another repository', () => {
  const flow = createFlow('checkout', ['payment-form'], 'another-repository');

  const diff = createDiff([{ entityId: 'payment-form', kind: 'modified' }]);

  assert.deepEqual(impactsFor([flow], diff), []);
});

test('returns no impacts when there are no entity changes', () => {
  const flow = createFlow('checkout', ['payment-form']);

  assert.deepEqual(impactsFor([flow], createDiff([])), []);
});

test('preserves incompatible comparison results', () => {
  const flow = createFlow('checkout', ['payment-form']);

  for (const reason of [
    'repository_mismatch',
    'analysis_profile_mismatch',
  ] as const) {
    const diff: SnapshotEntityDiff = {
      status: 'incompatible',
      reason,
    };

    assert.deepEqual(analyzeEntityFlowImpacts([flow], diff), diff);
  }
});

import {
  analyzeRelationFlowImpacts,
  type CodeReference,
  type CodeRelation,
  type CodeRelationChange,
  type Flow,
  type SnapshotRelationDiff,
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

function createRelation(
  id: string,
  overrides: Partial<CodeRelation> = {},
): CodeRelation {
  return {
    id,
    kind: 'calls',
    sourceEntityId: 'form',
    targetEntityId: 'order',
    ...overrides,
  };
}

function createDiff(
  changes: readonly CodeRelationChange[],
): SnapshotRelationDiff {
  return {
    status: 'compared',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    changes,
  };
}

function impactsFor(flows: readonly Flow[], diff: SnapshotRelationDiff) {
  const result = analyzeRelationFlowImpacts(flows, diff);

  assert.ok(result.status === 'analyzed');

  return result.impacts;
}

test('reports previous and current endpoints without mutation', () => {
  const flows = [
    createFlow('old-source', ['form']),
    createFlow('old-target', ['order']),
    createFlow('new-source', ['retry']),
    createFlow('new-target', ['draft']),
    createFlow('unrelated', ['profile']),
    createFlow('empty', []),
  ];

  const change: CodeRelationChange = {
    relationId: 'submit',
    kind: 'modified',
    before: createRelation('submit'),
    after: createRelation('submit', {
      sourceEntityId: 'retry',
      targetEntityId: 'draft',
    }),
  };

  const diff = createDiff([change]);
  const original = structuredClone({ flows, diff });

  const expectedMatches = [
    ['old-source', 'form'],
    ['old-target', 'order'],
    ['new-source', 'retry'],
    ['new-target', 'draft'],
  ] as const;

  assert.deepEqual(analyzeRelationFlowImpacts(flows, diff), {
    status: 'analyzed',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    impacts: expectedMatches.map(([flowId, entityId]) => ({
      flowId,
      reasons: [
        {
          type: 'relation',
          referenceId: `${flowId}-ref-0`,
          nodeId: 'payment',
          entityId,
          change,
        },
      ],
    })),
  });

  assert.deepEqual({ flows, diff }, original);
});

for (const kind of ['added', 'removed'] as const) {
  test(`reports both endpoints of ${kind} relations in one flow`, () => {
    const flow = createFlow('checkout', ['form', 'order']);
    const relation = createRelation('submit');

    const change: CodeRelationChange =
      kind === 'added'
        ? { relationId: relation.id, kind, after: relation }
        : { relationId: relation.id, kind, before: relation };

    assert.deepEqual(impactsFor([flow], createDiff([change])), [
      {
        flowId: 'checkout',
        reasons: ['form', 'order'].map((entityId, index) => ({
          type: 'relation',
          referenceId: `checkout-ref-${index}`,
          nodeId: 'payment',
          entityId,
          change,
        })),
      },
    ]);
  });
}

test('reports each reference only once per changed relation', () => {
  const flow = createFlow('checkout', ['form']);

  for (const targetEntityId of ['order', 'form']) {
    const before = createRelation('submit', { targetEntityId });

    const change: CodeRelationChange = {
      relationId: before.id,
      kind: 'modified',
      before,
      after: { ...before, kind: 'uses' },
    };

    assert.deepEqual(impactsFor([flow], createDiff([change])), [
      {
        flowId: 'checkout',
        reasons: [
          {
            type: 'relation',
            referenceId: 'checkout-ref-0',
            nodeId: 'payment',
            entityId: 'form',
            change,
          },
        ],
      },
    ]);
  }
});

test('preserves separate reasons for different changed relations', () => {
  const flow = createFlow('checkout', ['form']);

  const changes: readonly CodeRelationChange[] = [
    {
      relationId: 'first',
      kind: 'added',
      after: createRelation('first'),
    },
    {
      relationId: 'second',
      kind: 'added',
      after: createRelation('second', { kind: 'uses' }),
    },
  ];

  const impacts = impactsFor([flow], createDiff(changes));

  assert.equal(impacts.length, 1);

  const [impact] = impacts;
  assert.ok(impact);

  assert.deepEqual(
    impact.reasons.map((reason) => reason.change),
    changes,
  );
});

test('ignores matching entity IDs from another repository', () => {
  const flow = createFlow('checkout', ['form'], 'another-repository');

  const diff = createDiff([
    {
      relationId: 'submit',
      kind: 'added',
      after: createRelation('submit'),
    },
  ]);

  assert.deepEqual(impactsFor([flow], diff), []);
});

test('returns no impacts when there are no relation changes', () => {
  const flow = createFlow('checkout', ['form']);

  assert.deepEqual(impactsFor([flow], createDiff([])), []);
});

test('preserves incompatible comparison results', () => {
  const flow = createFlow('checkout', ['form']);

  for (const reason of [
    'repository_mismatch',
    'analysis_profile_mismatch',
  ] as const) {
    const diff: SnapshotRelationDiff = {
      status: 'incompatible',
      reason,
    };

    assert.deepEqual(analyzeRelationFlowImpacts([flow], diff), diff);
  }
});

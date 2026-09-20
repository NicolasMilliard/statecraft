import {
  analyzeSnapshotFlowImpacts,
  type CodeEntity,
  type CodeRelation,
  type Flow,
  type SyncSnapshot,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createEntity(id: string, structuralHash = 'v1'): CodeEntity {
  return {
    id,
    kind: 'function',
    name: id,
    filePath: `src/${id}.ts`,
    symbol: id,
    structuralHash,
  };
}

function createRelation(): CodeRelation {
  return {
    id: 'submit',
    kind: 'calls',
    sourceEntityId: 'form',
    targetEntityId: 'order',
  };
}

function createSnapshot(
  id: string,
  entities: readonly CodeEntity[],
  relations: readonly CodeRelation[] = [],
): SyncSnapshot {
  return {
    id,
    capturedAt: '2026-09-20T12:00:00.000Z',
    git: {
      commitSha: 'a'.repeat(40),
      isDirty: true,
    },
    analysisProfileId: 'test-v1',
    graph: {
      repositoryId: 'storefront',
      entities,
      relations,
    },
  };
}

function createFlow(
  id: string,
  codeEntityId: string,
  repositoryId = 'storefront',
): Flow {
  return {
    id,
    name: id,
    entryNodeId: 'payment',
    nodes: [{ id: 'payment', kind: 'ui', label: 'Payment form' }],
    edges: [],
    codeReferences: [
      {
        id: `${id}-ref`,
        flowNodeId: 'payment',
        repositoryId,
        codeEntityId,
        role: 'primary',
      },
    ],
  };
}

test('combines reasons by flow and preserves flow order without mutation', () => {
  const form = createEntity('form');
  const order = createEntity('order');
  const profile = createEntity('profile');
  const stable = createEntity('stable');
  const relation = createRelation();

  const before = createSnapshot('before', [form, order, profile, stable]);

  const after = createSnapshot(
    'after',
    [
      { ...form, structuralHash: 'v2' },
      order,
      { ...profile, structuralHash: 'v2' },
      stable,
    ],
    [relation],
  );

  const flows = [
    createFlow('relation-only', 'order'),
    createFlow('checkout', 'form'),
    createFlow('entity-only', 'profile'),
    createFlow('unrelated', 'stable'),
    createFlow('other-repository', 'form', 'another-repository'),
  ];

  const original = structuredClone({ flows, before, after });

  const relationChange = {
    relationId: 'submit',
    kind: 'added',
    after: relation,
  };

  assert.deepEqual(analyzeSnapshotFlowImpacts(flows, before, after), {
    status: 'analyzed',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    impacts: [
      {
        flowId: 'relation-only',
        reasons: [
          {
            type: 'relation',
            referenceId: 'relation-only-ref',
            nodeId: 'payment',
            entityId: 'order',
            change: relationChange,
          },
        ],
      },
      {
        flowId: 'checkout',
        reasons: [
          {
            type: 'entity',
            referenceId: 'checkout-ref',
            nodeId: 'payment',
            change: { entityId: 'form', kind: 'modified' },
          },
          {
            type: 'relation',
            referenceId: 'checkout-ref',
            nodeId: 'payment',
            entityId: 'form',
            change: relationChange,
          },
        ],
      },
      {
        flowId: 'entity-only',
        reasons: [
          {
            type: 'entity',
            referenceId: 'entity-only-ref',
            nodeId: 'payment',
            change: { entityId: 'profile', kind: 'modified' },
          },
        ],
      },
    ],
  });

  assert.deepEqual({ flows, before, after }, original);
});

for (const type of ['entity', 'relation'] as const) {
  test(`reports impacts when only ${type} changes exist`, () => {
    const form = createEntity('form');
    const order = createEntity('order');
    const flow = createFlow('checkout', 'form');

    const before = createSnapshot('before', [form, order]);

    const after = createSnapshot(
      'after',
      [type === 'entity' ? { ...form, structuralHash: 'v2' } : form, order],
      type === 'relation' ? [createRelation()] : [],
    );

    const result = analyzeSnapshotFlowImpacts([flow], before, after);

    assert.ok(result.status === 'analyzed');
    assert.equal(result.impacts.length, 1);

    const [impact] = result.impacts;
    assert.ok(impact);

    assert.equal(impact.flowId, 'checkout');
    assert.deepEqual(
      impact.reasons.map((reason) => reason.type),
      [type],
    );
  });
}

test('returns an empty analysis when neither entities nor relations change', () => {
  const entities = [createEntity('form'), createEntity('order')];
  const relations = [createRelation()];
  const flow = createFlow('checkout', 'form');

  const before = createSnapshot('before', entities, relations);
  const after = createSnapshot('after', entities, relations);

  assert.deepEqual(analyzeSnapshotFlowImpacts([flow], before, after), {
    status: 'analyzed',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    impacts: [],
  });
});

for (const reason of [
  'repository_mismatch',
  'analysis_profile_mismatch',
] as const) {
  test(`preserves ${reason} instead of returning an empty analysis`, () => {
    const flow = createFlow('checkout', 'form');
    const before = createSnapshot('before', []);
    const initial = createSnapshot('after', []);

    const after: SyncSnapshot =
      reason === 'repository_mismatch'
        ? {
            ...initial,
            graph: {
              ...initial.graph,
              repositoryId: 'another-repository',
            },
          }
        : {
            ...initial,
            analysisProfileId: 'test-v2',
          };

    assert.deepEqual(analyzeSnapshotFlowImpacts([flow], before, after), {
      status: 'incompatible',
      reason,
    });
  });
}

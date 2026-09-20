import {
  analyzeSnapshotFlowImpacts,
  evaluateFlowReview,
  recordFlowReview,
  type CodeEntity,
  type CodeRelationKind,
  type Flow,
  type FlowReview,
  type SyncSnapshot,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createFlow(id = 'checkout'): Flow {
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
        repositoryId: 'storefront',
        codeEntityId: 'form',
        role: 'primary',
      },
    ],
  };
}

function createReview(flowId = 'checkout', snapshotId = 'a'): FlowReview {
  return {
    flowId,
    repositoryId: 'storefront',
    snapshotId,
  };
}

function createSnapshot(
  id: string,
  structuralHash = 'v1',
  relationKind: CodeRelationKind = 'calls',
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
      entities: ['form', 'order'].map(
        (entityId): CodeEntity => ({
          id: entityId,
          kind: 'function',
          name: entityId,
          filePath: `src/${entityId}.ts`,
          symbol: entityId,
          structuralHash: entityId === 'form' ? structuralHash : 'order-v1',
        }),
      ),
      relations: [
        {
          id: 'submit',
          kind: relationKind,
          sourceEntityId: 'form',
          targetEntityId: 'order',
        },
      ],
    },
  };
}

for (const type of ['entity', 'relation'] as const) {
  test(`keeps ${type} impacts pending across an unchanged sync`, () => {
    const flow = createFlow();
    const review = createReview();
    const reviewed = createSnapshot('a');

    const hash = type === 'entity' ? 'v2' : 'v1';
    const kind = type === 'relation' ? 'uses' : 'calls';

    const changed = createSnapshot('b', hash, kind);
    const current = createSnapshot('c', hash, kind);

    const original = structuredClone({
      flow,
      review,
      reviewed,
      changed,
      current,
    });

    const latestSync = analyzeSnapshotFlowImpacts([flow], changed, current);

    assert.ok(latestSync.status === 'analyzed');
    assert.deepEqual(latestSync.impacts, []);

    const first = evaluateFlowReview(flow, review, reviewed, changed);

    assert.ok(first.status === 'needs_review');
    assert.equal(first.reviewedSnapshotId, 'a');
    assert.deepEqual(
      first.reasons.map((reason) => reason.type),
      [type],
    );

    assert.deepEqual(evaluateFlowReview(flow, review, reviewed, current), {
      ...first,
      currentSnapshotId: 'c',
    });

    assert.deepEqual({ flow, review, reviewed, changed, current }, original);
  });
}

test('uses the review recorded for each flow independently', () => {
  const checkout = createFlow('checkout');
  const renewal = createFlow('renewal');

  const previous = createSnapshot('a');
  const reviewed = createSnapshot('b', 'v2');
  const current = createSnapshot('c', 'v2');

  assert.deepEqual(
    evaluateFlowReview(
      checkout,
      createReview('checkout', 'b'),
      reviewed,
      current,
    ),
    {
      status: 'unchanged',
      flowId: 'checkout',
      repositoryId: 'storefront',
      reviewedSnapshotId: 'b',
      currentSnapshotId: 'c',
    },
  );

  const pending = evaluateFlowReview(
    renewal,
    createReview('renewal', 'a'),
    previous,
    current,
  );

  assert.ok(pending.status === 'needs_review');
  assert.equal(pending.flowId, 'renewal');
  assert.equal(pending.reviewedSnapshotId, 'a');
});

test('reports a flow without a recorded review as unreviewed', () => {
  assert.deepEqual(
    evaluateFlowReview(createFlow(), null, null, createSnapshot('c')),
    {
      status: 'unreviewed',
      flowId: 'checkout',
      repositoryId: 'storefront',
      currentSnapshotId: 'c',
    },
  );
});

test('reports unavailable comparisons instead of clearing review status', () => {
  const flow = createFlow();
  const review = createReview();
  const reviewed = createSnapshot('a');
  const current = createSnapshot('c');

  const cases = [
    {
      review: { ...review, flowId: 'another-flow' },
      snapshot: reviewed,
      reason: 'review_flow_mismatch',
    },
    {
      review: { ...review, repositoryId: 'another-repository' },
      snapshot: reviewed,
      reason: 'review_repository_mismatch',
    },
    {
      review,
      snapshot: null,
      reason: 'reviewed_snapshot_unavailable',
    },
    {
      review,
      snapshot: { ...reviewed, id: 'another-snapshot' },
      reason: 'reviewed_snapshot_mismatch',
    },
    {
      review,
      snapshot: {
        ...reviewed,
        graph: {
          ...reviewed.graph,
          repositoryId: 'another-repository',
        },
      },
      reason: 'repository_mismatch',
    },
    {
      review,
      snapshot: {
        ...reviewed,
        analysisProfileId: 'another-profile',
      },
      reason: 'analysis_profile_mismatch',
    },
  ] as const;

  for (const example of cases) {
    assert.deepEqual(
      evaluateFlowReview(flow, example.review, example.snapshot, current),
      {
        status: 'unavailable',
        flowId: 'checkout',
        repositoryId: 'storefront',
        reviewedSnapshotId: 'a',
        currentSnapshotId: 'c',
        reason: example.reason,
      },
      example.reason,
    );
  }
});

test('records an explicit review and clears the examined impacts', () => {
  const flow = createFlow();
  const previous = createSnapshot('a');
  const examined = createSnapshot('b', 'v2');

  const initial = recordFlowReview([], flow, previous);
  const [oldReview] = initial;
  assert.ok(oldReview);

  assert.equal(
    evaluateFlowReview(flow, oldReview, previous, examined).status,
    'needs_review',
  );

  const original = structuredClone({ initial, flow, examined });

  const updated = recordFlowReview(initial, flow, examined);

  assert.deepEqual(updated, [createReview('checkout', 'b')]);

  const [newReview] = updated;
  assert.ok(newReview);

  assert.deepEqual(evaluateFlowReview(flow, newReview, examined, examined), {
    status: 'unchanged',
    flowId: 'checkout',
    repositoryId: 'storefront',
    reviewedSnapshotId: 'b',
    currentSnapshotId: 'b',
  });

  assert.deepEqual({ initial, flow, examined }, original);
});

test('preserves reviews belonging to other flows or repositories', () => {
  const flow = createFlow();

  const neighbors: readonly FlowReview[] = [
    createReview('renewal', 'a'),
    {
      ...createReview('checkout', 'api-a'),
      repositoryId: 'api',
    },
  ];

  const first = recordFlowReview(neighbors, flow, createSnapshot('b'));

  assert.deepEqual(first, [...neighbors, createReview('checkout', 'b')]);

  const original = structuredClone({ neighbors, first });

  const updated = recordFlowReview(first, flow, createSnapshot('c'));

  assert.deepEqual(updated, [...neighbors, createReview('checkout', 'c')]);

  assert.deepEqual({ neighbors, first }, original);
});

test('recording the same snapshot twice keeps a single review', () => {
  const flow = createFlow();
  const snapshot = createSnapshot('b');

  const once = recordFlowReview([], flow, snapshot);
  const twice = recordFlowReview(once, flow, snapshot);

  assert.deepEqual(twice, once);
  assert.equal(twice.length, 1);
});

test('reviewing B leaves newer changes in C pending', () => {
  const flow = createFlow();
  const examined = createSnapshot('b', 'v2');
  const current = createSnapshot('c', 'v3');

  const reviews = recordFlowReview([createReview()], flow, examined);

  const [review] = reviews;
  assert.ok(review);

  assert.deepEqual(evaluateFlowReview(flow, review, examined, current), {
    status: 'needs_review',
    flowId: 'checkout',
    repositoryId: 'storefront',
    reviewedSnapshotId: 'b',
    currentSnapshotId: 'c',
    reasons: [
      {
        type: 'entity',
        referenceId: 'checkout-ref',
        nodeId: 'payment',
        change: {
          entityId: 'form',
          kind: 'modified',
        },
      },
    ],
  });
});

import { recordFlowReview, type Flow, type SnapshotDocument } from '@statecraft/core';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessWorkspaceFlowReview } from '../src/sync/workspace-flow-reviews.ts';

function flow(entityId = 'form'): Flow {
  return {
    id: 'checkout',
    name: 'Checkout',
    entryNodeId: 'payment',
    nodes: [{ id: 'payment', kind: 'ui', label: 'Payment form' }],
    edges: [],
    codeReferences: [{
      id: 'form-ref',
      flowNodeId: 'payment',
      repositoryId: 'storefront',
      codeEntityId: entityId,
      role: 'primary',
    }],
  };
}

function document(id: string, structuralHash: string): SnapshotDocument {
  return {
    formatVersion: 1,
    snapshot: {
      id,
      capturedAt: '2026-10-12T10:00:00.000Z',
      git: { commitSha: 'a'.repeat(40), isDirty: false },
      analysisProfileId: 'test-v1',
      graph: {
        repositoryId: 'storefront',
        entities: [{
          id: 'form',
          kind: 'component',
          name: 'CheckoutForm',
          filePath: 'src/CheckoutForm.tsx',
          symbol: 'CheckoutForm',
          structuralHash,
        }],
        relations: [],
      },
    },
    diagnostics: [],
  };
}

test('distinguishes no snapshot, unmapped and unreviewed', () => {
  const checkout = flow();
  const current = document('current', 'v1');

  assert.deepEqual(assessWorkspaceFlowReview(checkout, [], [], null), {
    status: 'no_snapshot', flowId: 'checkout',
  });
  assert.equal(assessWorkspaceFlowReview({ ...checkout, codeReferences: [] }, [], [current], current.snapshot).status, 'unmapped');
  assert.equal(assessWorkspaceFlowReview(checkout, [], [current], current.snapshot).status, 'unreviewed');
});

test('uses the recorded checkpoint instead of the exploratory comparison', () => {
  const checkout = flow();
  const reviewed = document('reviewed', 'v1');
  const changed = document('changed', 'v2');
  const laterUnchanged = document('later', 'v2');
  const reviews = recordFlowReview([], checkout, reviewed.snapshot);

  const pending = assessWorkspaceFlowReview(
    checkout, reviews, [reviewed, changed, laterUnchanged], laterUnchanged.snapshot,
  );
  assert.equal(pending.status, 'needs_review');
  if (pending.status !== 'needs_review') return;
  assert.equal(pending.reviewedSnapshotId, 'reviewed');
  assert.equal(pending.reasons[0]?.type, 'entity');

  assert.equal(assessWorkspaceFlowReview(
    checkout, reviews, [reviewed, changed], reviewed.snapshot,
  ).status, 'unchanged');
});

test('keeps missing or incompatible reviewed snapshots unavailable', () => {
  const checkout = flow();
  const reviewed = document('reviewed', 'v1');
  const current = document('current', 'v2');
  const reviews = recordFlowReview([], checkout, reviewed.snapshot);

  assert.deepEqual(assessWorkspaceFlowReview(checkout, reviews, [current], current.snapshot), {
    status: 'unavailable',
    flowId: 'checkout',
    repositoryId: 'storefront',
    currentSnapshotId: 'current',
    reviewedSnapshotId: 'reviewed',
    reason: 'reviewed_snapshot_unavailable',
  });
  const incompatible = {
    ...reviewed,
    snapshot: { ...reviewed.snapshot, analysisProfileId: 'test-v2' },
  };
  assert.equal(assessWorkspaceFlowReview(
    checkout, reviews, [incompatible, current], current.snapshot,
  ).status, 'unavailable');
});

test('reports a changed code mapping as unreviewed even with a saved checkpoint', () => {
  const checkout = flow();
  const reviewed = document('reviewed', 'v1');
  const reviews = recordFlowReview([], checkout, reviewed.snapshot);

  assert.deepEqual(assessWorkspaceFlowReview(
    flow('another-entity'), reviews, [reviewed], reviewed.snapshot,
  ), {
    status: 'unreviewed',
    flowId: 'checkout',
    repositoryId: 'storefront',
    currentSnapshotId: 'reviewed',
    reviewedSnapshotId: 'reviewed',
    reason: 'mapping_changed',
  });
});

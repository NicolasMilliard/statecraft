import { recordFlowReview, type Flow, type SnapshotDocument } from '@statecraft/core';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseFlowDocument } from '../src/editor/flow-document.ts';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import { parseSnapshotDocument } from '../src/editor/open-document.ts';
import { assessProjectFlowReviews } from '../src/sync/project-flow-reviews.ts';

const checkout = parseFlowDocument(readFileSync(
  new URL('./fixtures/checkout-mapping-demo.statecraft.json', import.meta.url), 'utf8',
));
const baseline = parseSnapshotDocument(JSON.parse(readFileSync(
  new URL('./fixtures/storefront.snapshot.json', import.meta.url), 'utf8',
)) as unknown);
const formId = 'component:src/components/CheckoutForm.tsx#CheckoutForm';

function editor(flow: Flow): FlowEditorState {
  const layout = { flowId: flow.id, positions: Object.fromEntries(flow.nodes.map((node) => [node.id, { x: 0, y: 0 }])) };
  return {
    flow, layout, initialLayout: layout, scenarios: [],
    reviews: recordFlowReview([], flow, baseline.snapshot),
  };
}

function changedDocument(id: string): SnapshotDocument {
  return {
    ...baseline,
    snapshot: {
      ...baseline.snapshot,
      id,
      graph: {
        ...baseline.snapshot.graph,
        entities: baseline.snapshot.graph.entities.map((entity) => entity.id === formId
          ? { ...entity, structuralHash: 'a'.repeat(64) }
          : entity),
      },
    },
  };
}

test('Checkout fixture keeps both saved flows pending until each is explicitly reviewed', () => {
  const current = changedDocument('changed');
  const later = changedDocument('later-unchanged');
  const first = editor(checkout.flow);
  const second = editor({
    ...checkout.flow,
    id: 'renewal',
    name: 'Renewal',
    codeReferences: checkout.flow.codeReferences.map((reference) => ({
      ...reference, id: `renewal-${reference.id}`,
    })),
  });
  const unrelated = editor({
    ...checkout.flow,
    id: 'profile',
    name: 'Profile',
    codeReferences: [{
      id: 'profile-ref',
      flowNodeId: 'payment-form',
      repositoryId: 'storefront',
      codeEntityId: 'component:src/pages/CheckoutPage.tsx#CheckoutPage',
      role: 'primary',
    }],
  });

  const pending = assessProjectFlowReviews(
    [first, second, unrelated], first.flow, first.reviews, false,
    [baseline, current, later], later.snapshot,
  );
  assert.equal(pending.needsReviewCount, 2);
  assert.deepEqual(pending.saved.map(({ assessment }) => assessment.status), [
    'needs_review', 'needs_review', 'unchanged',
  ]);
  for (const item of pending.saved.slice(0, 2)) {
    const { assessment } = item;
    assert.equal(assessment.status, 'needs_review');
    if (assessment.status !== 'needs_review') continue;
    assert.equal(assessment.reviewedSnapshotId, baseline.snapshot.id);
    assert.ok(assessment.reasons.some((reason) =>
      reason.type === 'entity' && reason.change.entityId === formId &&
      reason.nodeId === 'payment-form'));
  }

  const reviewedFirst = {
    ...first,
    reviews: recordFlowReview(first.reviews, first.flow, later.snapshot),
  };
  const afterOneReview = assessProjectFlowReviews(
    [reviewedFirst, second, unrelated], first.flow, reviewedFirst.reviews, false,
    [baseline, current, later], later.snapshot,
  );
  assert.equal(afterOneReview.needsReviewCount, 1);
  assert.deepEqual(afterOneReview.saved.map(({ assessment }) => assessment.status), [
    'unchanged', 'needs_review', 'unchanged',
  ]);
});

test('Checkout fixture keeps removed code visible and ignores unrelated relations', () => {
  const saved = editor(checkout.flow);
  const linkedIds = new Set(saved.flow.codeReferences.map((reference) => reference.codeEntityId));
  const unrelated = baseline.snapshot.graph.relations.find((relation) =>
    !linkedIds.has(relation.sourceEntityId) && !linkedIds.has(relation.targetEntityId));
  assert.ok(unrelated);

  const changedRelation: SnapshotDocument = {
    ...baseline,
    snapshot: {
      ...baseline.snapshot,
      id: 'unrelated-relation',
      graph: {
        ...baseline.snapshot.graph,
        relations: baseline.snapshot.graph.relations.map((relation) => relation.id === unrelated.id
          ? { ...relation, kind: relation.kind === 'calls' ? 'uses' : 'calls' }
          : relation),
      },
    },
  };
  const unrelatedAssessment = assessProjectFlowReviews(
    [saved], saved.flow, saved.reviews, false,
    [baseline, changedRelation], changedRelation.snapshot,
  );
  assert.equal(unrelatedAssessment.saved[0]?.assessment.status, 'unchanged');

  const removed: SnapshotDocument = {
    ...baseline,
    snapshot: {
      ...baseline.snapshot,
      id: 'removed-form',
      graph: {
        ...baseline.snapshot.graph,
        entities: baseline.snapshot.graph.entities.filter((entity) => entity.id !== formId),
        relations: baseline.snapshot.graph.relations.filter((relation) =>
          relation.sourceEntityId !== formId && relation.targetEntityId !== formId),
      },
    },
  };
  const removedAssessment = assessProjectFlowReviews(
    [saved], saved.flow, saved.reviews, false, [baseline, removed], removed.snapshot,
  );
  const assessment = removedAssessment.saved[0]?.assessment;
  assert.equal(assessment?.status, 'needs_review');
  if (assessment?.status !== 'needs_review') return;
  assert.ok(assessment.reasons.some((reason) =>
    reason.type === 'entity' && reason.change.kind === 'removed' &&
    reason.change.entityId === formId && reason.nodeId === 'payment-form' &&
    reason.referenceId === 'payment-form-ref'));
  assert.ok(assessment.reasons.some((reason) =>
    reason.type === 'relation' && reason.change.kind === 'removed' &&
    reason.nodeId === 'payment-form'));
  assert.ok(saved.flow.codeReferences.some((reference) => reference.codeEntityId === formId));
});

import { recordFlowReview, type CodeEntity, type Flow, type SnapshotDocument } from '@statecraft/core';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import { assessProjectFlowReviews } from '../src/sync/project-flow-reviews.ts';

function entity(id: string, structuralHash: string): CodeEntity {
  return {
    id, kind: 'component', name: id, filePath: `src/${id}.tsx`,
    symbol: id, structuralHash,
  };
}

function document(id: string, formHash: string): SnapshotDocument {
  return {
    formatVersion: 1,
    snapshot: {
      id,
      capturedAt: '2026-10-12T10:00:00.000Z',
      git: { commitSha: 'a'.repeat(40), isDirty: false },
      analysisProfileId: 'test-v1',
      graph: {
        repositoryId: 'storefront',
        entities: [entity('form', formHash), entity('profile', 'v1')],
        relations: [],
      },
    },
    diagnostics: [],
  };
}

function flow(id: string, codeEntityId: string): Flow {
  return {
    id, name: id, entryNodeId: 'node',
    nodes: [{ id: 'node', kind: 'ui', label: `${id} screen` }],
    edges: [],
    codeReferences: [{
      id: `${id}-ref`, flowNodeId: 'node', repositoryId: 'storefront',
      codeEntityId, role: 'primary',
    }],
  };
}

function saved(flowValue: Flow, reviewed: SnapshotDocument): FlowEditorState {
  const layout = { flowId: flowValue.id, positions: {} };
  return {
    flow: flowValue, layout, initialLayout: layout, scenarios: [],
    reviews: recordFlowReview([], flowValue, reviewed.snapshot),
  };
}

test('counts distinct saved flows pending review and keeps unrelated flows up to date', () => {
  const before = document('before', 'v1');
  const after = document('after', 'v2');
  const first = saved(flow('checkout', 'form'), before);
  const second = saved(flow('renewal', 'form'), before);
  const third = saved(flow('profile', 'profile'), before);
  const result = assessProjectFlowReviews(
    [first, second, third], first.flow, first.reviews, false,
    [before, after], after.snapshot,
  );

  assert.equal(result.needsReviewCount, 2);
  assert.deepEqual(result.saved.map(({ assessment }) => assessment.status), [
    'needs_review', 'needs_review', 'unchanged',
  ]);
  assert.equal(result.activePreview, null);
  assert.deepEqual(
    result.saved.slice(0, 2).map(({ assessment }) =>
      assessment.status === 'needs_review' ? assessment.reasons[0]?.nodeId : null),
    ['node', 'node'],
  );
});

test('reviewing one flow leaves another pending and an unsaved preview does not change the saved count', () => {
  const before = document('before', 'v1');
  const after = document('after', 'v2');
  const first = saved(flow('checkout', 'form'), before);
  const second = saved(flow('renewal', 'form'), before);
  const reviewedFirst = { ...first, reviews: recordFlowReview(first.reviews, first.flow, after.snapshot) };
  const active = { ...first.flow, codeReferences: [] };
  const result = assessProjectFlowReviews(
    [reviewedFirst, second], active, reviewedFirst.reviews, true,
    [before, after], after.snapshot,
  );

  assert.equal(result.needsReviewCount, 1);
  assert.deepEqual(result.saved.map(({ assessment }) => assessment.status), ['unchanged', 'needs_review']);
  assert.equal(result.activePreview?.status, 'unmapped');
});

test('keeps unreviewed, unavailable, and unmapped separate from a zero impact count', () => {
  const before = document('before', 'v1');
  const current = document('current', 'v1');
  const unreviewed = { ...saved(flow('new', 'form'), before), reviews: [] };
  const unavailable = saved(flow('missing', 'form'), before);
  const unmapped = saved({ ...flow('external', 'form'), codeReferences: [] }, before);
  const result = assessProjectFlowReviews(
    [unreviewed, unavailable, unmapped], unreviewed.flow, [], false,
    [current], current.snapshot,
  );

  assert.equal(result.needsReviewCount, 0);
  assert.deepEqual(result.saved.map(({ assessment }) => assessment.status), [
    'unreviewed', 'unavailable', 'unmapped',
  ]);
  const withoutSnapshot = assessProjectFlowReviews(
    [unreviewed], unreviewed.flow, [], false, [], null,
  );
  assert.equal(withoutSnapshot.saved[0]?.assessment.status, 'no_snapshot');
});

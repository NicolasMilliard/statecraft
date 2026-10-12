import type { CodeEntity, Flow, SyncSnapshot } from '@statecraft/core';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import {
  analyzeWorkspaceFlowImpacts,
  collectWorkspaceFlows,
} from '../src/sync/workspace-flow-impacts.ts';

function entity(id: string, structuralHash: string): CodeEntity {
  return {
    id,
    kind: 'component',
    name: id,
    filePath: `src/${id}.tsx`,
    symbol: id,
    structuralHash,
  };
}

function snapshot(id: string, entities: readonly CodeEntity[]): SyncSnapshot {
  return {
    id,
    capturedAt: '2026-10-11T10:00:00.000Z',
    git: { commitSha: 'a'.repeat(40), isDirty: false },
    analysisProfileId: 'test-v1',
    graph: { repositoryId: 'storefront', entities, relations: [] },
  };
}

function flow(id: string, codeEntityId: string, repositoryId = 'storefront'): Flow {
  return {
    id,
    name: id,
    entryNodeId: 'node',
    nodes: [{ id: 'node', kind: 'ui', label: `${id} screen` }],
    edges: [],
    codeReferences: [{
      id: `${id}-ref`,
      flowNodeId: 'node',
      repositoryId,
      codeEntityId,
      role: 'primary',
    }],
  };
}

function saved(flowValue: Flow): FlowEditorState {
  const layout = { flowId: flowValue.id, positions: {} };
  return { flow: flowValue, layout, initialLayout: layout, scenarios: [] };
}

test('analyzes every mapped saved flow once and excludes unrelated references', () => {
  const first = flow('checkout', 'form');
  const second = flow('renewal', 'form');
  const unrelated = flow('profile', 'profile');
  const otherRepository = flow('external', 'form', 'other-repository');
  const workspace = collectWorkspaceFlows(
    [saved(first), saved(second), saved(unrelated), saved(otherRepository)],
    first,
    false,
  );
  const before = snapshot('before', [entity('form', 'v1'), entity('profile', 'v1')]);
  const after = snapshot('after', [entity('form', 'v2'), entity('profile', 'v1')]);
  const result = analyzeWorkspaceFlowImpacts(workspace, before, after);

  assert.equal(result.status, 'analyzed');
  if (result.status !== 'analyzed') return;
  assert.equal(result.mappedFlowCount, 3);
  assert.deepEqual(result.impacts.map(({ flow: item, isPreview }) => [item.id, isPreview]), [
    ['checkout', false],
    ['renewal', false],
  ]);
  assert.deepEqual(result.impacts.map(({ reasons }) => reasons[0]?.referenceId), [
    'checkout-ref',
    'renewal-ref',
  ]);
});

test('uses unsaved active mapping instead of its saved copy without duplicating the flow', () => {
  const savedCheckout = flow('checkout', 'profile');
  const activeCheckout = flow('checkout', 'form');
  const workspace = collectWorkspaceFlows([saved(savedCheckout)], activeCheckout, true);
  const before = snapshot('before', [entity('form', 'v1'), entity('profile', 'v1')]);
  const after = snapshot('after', [entity('form', 'v2'), entity('profile', 'v1')]);
  const result = analyzeWorkspaceFlowImpacts(workspace, before, after);

  assert.equal(workspace.length, 1);
  assert.strictEqual(workspace[0]?.flow, activeCheckout);
  assert.deepEqual(workspace.map(({ isSaved, isPreview }) => [isSaved, isPreview]), [[true, true]]);
  assert.equal(result.status, 'analyzed');
  if (result.status !== 'analyzed') return;
  assert.equal(result.impacts.length, 1);
  assert.equal(result.impacts[0]?.reasons[0]?.type, 'entity');
  assert.equal(result.impacts[0]?.isPreview, true);
});

test('includes a new unsaved active flow as a preview', () => {
  const active = flow('new-flow', 'form');
  const workspace = collectWorkspaceFlows([saved(flow('other', 'profile'))], active, true);
  const result = analyzeWorkspaceFlowImpacts(
    workspace,
    snapshot('before', [entity('form', 'v1'), entity('profile', 'v1')]),
    snapshot('after', [entity('form', 'v2'), entity('profile', 'v1')]),
  );

  assert.equal(result.status, 'analyzed');
  if (result.status !== 'analyzed') return;
  assert.equal(result.mappedFlowCount, 2);
  assert.deepEqual(result.impacts.map(({ flow: item, isSaved, isPreview }) => [item.id, isSaved, isPreview]), [
    ['new-flow', false, true],
  ]);
});

test('preserves snapshot incompatibility instead of reporting zero impacts', () => {
  const before = snapshot('before', [entity('form', 'v1')]);
  const after = {
    ...snapshot('after', [entity('form', 'v2')]),
    analysisProfileId: 'test-v2',
  };
  const workspace = collectWorkspaceFlows([saved(flow('checkout', 'form'))], flow('checkout', 'form'), false);

  assert.deepEqual(analyzeWorkspaceFlowImpacts(workspace, before, after), {
    status: 'incompatible',
    reason: 'analysis_profile_mismatch',
  });
});

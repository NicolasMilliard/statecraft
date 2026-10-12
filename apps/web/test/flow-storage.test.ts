import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serializeFlowDocument } from '../src/editor/flow-document.ts';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import {
  loadFlowDraft,
  loadSavedFlows,
  openSavedFlowDraft,
  saveFlowDraft,
  saveFlowReviewCheckpoint,
} from '../src/editor/flow-storage.ts';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';

function createStorage() {
  const entries = new Map<string, string>();

  return {
    get length(): number {
      return entries.size;
    },
    key(index: number): string | null {
      return [...entries.keys()][index] ?? null;
    },
    getItem(key: string): string | null {
      return entries.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      entries.set(key, value);
    },
  };
}

function createEditor(flowId: string): FlowEditorState {
  return {
    flow: {
      ...checkoutFlow,
      id: flowId,
    },
    layout: {
      ...checkoutLayout,
      flowId,
    },
    initialLayout: {
      ...checkoutLayout,
      flowId,
    },
    scenarios: [{
      id: 'default',
      flowId,
      name: 'Default',
      overrides: [],
    }],
    reviews: [],
  };
}

test('reports a missing draft when storage is empty', () => {
  assert.deepEqual(loadFlowDraft('checkout', createStorage()), {
    status: 'missing',
  });
});

test('reloads the saved flow even when its ID differs from the fallback', () => {
  const storage = createStorage();
  const editor = createEditor('another-flow');

  assert.equal(saveFlowDraft(editor, storage), true);
  assert.deepEqual(loadFlowDraft('checkout', storage), {
    status: 'loaded',
    editor,
  });
});

test('keeps several saved flows and reopens the selected one after reload', () => {
  const storage = createStorage();
  const checkout = createEditor('checkout');
  const renewal = createEditor('renewal');

  assert.equal(saveFlowDraft(checkout, storage), true);
  assert.equal(saveFlowDraft(renewal, storage), true);
  assert.deepEqual(loadSavedFlows(storage), {
    status: 'loaded',
    editors: [checkout, renewal],
    invalidCount: 0,
  });
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: renewal });

  assert.deepEqual(openSavedFlowDraft('checkout', storage), { status: 'loaded', editor: checkout });
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: checkout });
  assert.deepEqual(loadSavedFlows(storage).editors, [checkout, renewal]);
});

test('persists a review in its saved Flow and preserves the previous checkpoint on failure', () => {
  const storage = createStorage();
  const initial = createEditor('checkout');
  const linked = {
    ...initial,
    flow: {
      ...initial.flow,
      codeReferences: [{
        id: 'checkout-ref',
        flowNodeId: 'checkout-screen',
        repositoryId: 'storefront',
        codeEntityId: 'form',
        role: 'primary' as const,
      }],
    },
  };
  assert.equal(saveFlowDraft(linked, storage), true);

  const reviewed = {
    ...linked,
    reviews: [{
      flowId: 'checkout',
      repositoryId: 'storefront',
      snapshotId: 'snapshot-a',
      reviewedReferences: [{
        id: 'checkout-ref',
        flowNodeId: 'checkout-screen',
        codeEntityId: 'form',
        role: 'primary' as const,
      }],
    }],
  };
  assert.equal(saveFlowReviewCheckpoint(reviewed, storage), true);
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: reviewed });
  assert.deepEqual(loadSavedFlows(storage).editors, [reviewed]);

  const nextReview = {
    ...reviewed,
    reviews: [{ ...reviewed.reviews[0]!, snapshotId: 'snapshot-b' }],
  };
  const failingStorage = {
    getItem: storage.getItem,
    setItem(key: string, value: string): void {
      if (key === 'statecraft:saved-flow:checkout') throw new Error('Storage unavailable');
      storage.setItem(key, value);
    },
  };
  assert.equal(saveFlowReviewCheckpoint(nextReview, failingStorage), false);
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: reviewed });
});

test('does not record a review for a flow without a durable saved copy', () => {
  const storage = createStorage();
  assert.equal(saveFlowReviewCheckpoint(createEditor('new-flow'), storage), false);
  assert.equal(storage.getItem('statecraft:saved-flow:new-flow'), null);
});

test('records a review when the active saved Flow still uses legacy storage', () => {
  const storage = createStorage();
  const legacy = createEditor('legacy');
  const { reviews: _reviews, ...legacyEditor } = legacy;
  storage.setItem('statecraft:active-flow', JSON.stringify({ version: 2, editor: legacyEditor }));

  const reviewed = {
    ...legacy,
    reviews: [{
      flowId: 'legacy', repositoryId: 'storefront', snapshotId: 'snapshot-a', reviewedReferences: [],
    }],
  };

  assert.equal(saveFlowReviewCheckpoint(reviewed, storage), true);
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: reviewed });
});

test('preserves the former active flow when a new flow is saved', () => {
  const storage = createStorage();
  const previous = createEditor('previous');
  const next = createEditor('next');
  const legacyDocument = serializeFlowDocument(previous);

  storage.setItem('statecraft:active-flow', legacyDocument);
  assert.deepEqual(loadSavedFlows(storage).editors, [previous]);

  assert.equal(saveFlowDraft(next, storage), true);
  assert.equal(storage.getItem('statecraft:active-flow'), legacyDocument);
  assert.deepEqual(loadSavedFlows(storage).editors, [next, previous]);
  assert.deepEqual(openSavedFlowDraft('previous', storage), { status: 'loaded', editor: previous });
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: previous });
});

test('migrates the latest legacy active copy over a stale saved copy', () => {
  const storage = createStorage();
  const stale = createEditor('previous');
  const latest = {
    ...stale,
    flow: { ...stale.flow, name: 'Latest name' },
  };
  storage.setItem('statecraft:saved-flow:previous', serializeFlowDocument(stale));
  storage.setItem('statecraft:active-flow', serializeFlowDocument(latest));

  assert.deepEqual(loadSavedFlows(storage).editors, [latest]);
  assert.equal(saveFlowDraft(createEditor('next'), storage), true);
  assert.deepEqual(openSavedFlowDraft('previous', storage), { status: 'loaded', editor: latest });
});

test('reads the legacy draft and preserves it when saving an active flow', () => {
  const storage = createStorage();
  const legacyEditor = createEditor('checkout');
  const { scenarios: _scenarios, reviews: _reviews, ...legacyState } = legacyEditor;
  const legacyDocument = JSON.stringify({ version: 1, editor: legacyState });

  storage.setItem('statecraft:flow:checkout', legacyDocument);

  assert.deepEqual(loadFlowDraft('checkout', storage), {
    status: 'loaded',
    editor: { ...legacyState, scenarios: [], reviews: [] },
  });

  const activeEditor = createEditor('new-flow');

  assert.equal(saveFlowDraft(activeEditor, storage), true);
  assert.deepEqual(loadFlowDraft('checkout', storage), {
    status: 'loaded',
    editor: activeEditor,
  });
  assert.equal(storage.getItem('statecraft:flow:checkout'), legacyDocument);
  assert.deepEqual(loadSavedFlows(storage).editors, [
    { ...legacyState, scenarios: [], reviews: [] },
    activeEditor,
  ]);
});

test('does not activate an invalid or missing saved flow', () => {
  const storage = createStorage();
  const valid = createEditor('checkout');
  assert.equal(saveFlowDraft(valid, storage), true);
  storage.setItem('statecraft:saved-flow:broken', '{');

  assert.deepEqual(loadSavedFlows(storage), {
    status: 'loaded',
    editors: [valid],
    invalidCount: 1,
  });
  assert.deepEqual(openSavedFlowDraft('broken', storage), { status: 'unavailable' });
  assert.deepEqual(openSavedFlowDraft('missing', storage), { status: 'missing' });
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: valid });
});

test('a failed activation keeps the previously selected flow', () => {
  const storage = createStorage();
  const checkout = createEditor('checkout');
  const renewal = createEditor('renewal');
  assert.equal(saveFlowDraft(checkout, storage), true);
  assert.equal(saveFlowDraft(renewal, storage), true);
  assert.deepEqual(openSavedFlowDraft('checkout', storage), { status: 'loaded', editor: checkout });

  const failingStorage = {
    getItem: storage.getItem,
    setItem(key: string, value: string): void {
      if (key === 'statecraft:active-flow-id') throw new Error('Storage unavailable');
      storage.setItem(key, value);
    },
  };

  assert.deepEqual(openSavedFlowDraft('renewal', failingStorage), { status: 'unavailable' });
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: checkout });
});

test('a failed legacy migration does not replace the active flow', () => {
  const storage = createStorage();
  const legacy = createEditor('legacy');
  storage.setItem('statecraft:active-flow', serializeFlowDocument(legacy));
  const failingStorage = {
    getItem: storage.getItem,
    setItem(key: string, value: string): void {
      if (key === 'statecraft:saved-flow:legacy') throw new Error('Storage unavailable');
      storage.setItem(key, value);
    },
  };

  assert.equal(saveFlowDraft(createEditor('next'), failingStorage), false);
  assert.deepEqual(loadFlowDraft('checkout', storage), { status: 'loaded', editor: legacy });
  assert.equal(storage.getItem('statecraft:active-flow-id'), null);
});

test('reports an invalid active document even when a legacy draft exists', () => {
  const storage = createStorage();

  storage.setItem(
    'statecraft:flow:checkout',
    serializeFlowDocument(createEditor('checkout')),
  );
  storage.setItem('statecraft:active-flow', '{');

  assert.deepEqual(loadFlowDraft('checkout', storage), {
    status: 'invalid',
  });
  assert.equal(storage.getItem('statecraft:active-flow'), '{');
});

test('handles storage access failures', () => {
  const storage = {
    getItem(): string | null {
      throw new Error('Storage unavailable');
    },
    setItem(): void {
      throw new Error('Storage unavailable');
    },
  };

  assert.deepEqual(loadFlowDraft('checkout', storage), {
    status: 'unavailable',
  });
  assert.equal(saveFlowDraft(createEditor('checkout'), storage), false);
  assert.deepEqual(openSavedFlowDraft('checkout', storage), { status: 'unavailable' });
});

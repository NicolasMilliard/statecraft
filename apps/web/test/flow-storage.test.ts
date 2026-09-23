import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serializeFlowDocument } from '../src/editor/flow-document.ts';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import { loadFlowDraft, saveFlowDraft } from '../src/editor/flow-storage.ts';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';

function createStorage() {
  const entries = new Map<string, string>();

  return {
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

test('reads the legacy draft and preserves it when saving an active flow', () => {
  const storage = createStorage();
  const legacyEditor = createEditor('checkout');
  const legacyDocument = serializeFlowDocument(legacyEditor);

  storage.setItem('statecraft:flow:checkout', legacyDocument);

  assert.deepEqual(loadFlowDraft('checkout', storage), {
    status: 'loaded',
    editor: legacyEditor,
  });

  const activeEditor = createEditor('new-flow');

  assert.equal(saveFlowDraft(activeEditor, storage), true);
  assert.deepEqual(loadFlowDraft('checkout', storage), {
    status: 'loaded',
    editor: activeEditor,
  });
  assert.equal(storage.getItem('statecraft:flow:checkout'), legacyDocument);
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
});

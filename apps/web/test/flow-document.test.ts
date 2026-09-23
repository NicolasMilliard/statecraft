import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseFlowDocument,
  serializeFlowDocument,
} from '../src/editor/flow-document.ts';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';

const editor: FlowEditorState = {
  flow: checkoutFlow,
  layout: {
    ...checkoutLayout,
    positions: {
      ...checkoutLayout.positions,
      'checkout-screen': { x: 120, y: 300 },
    },
  },
  initialLayout: checkoutLayout,
};

function encode(value: unknown, version = 1): string {
  return JSON.stringify({ version, editor: value });
}

test('preserves the flow, current positions and reset positions', () => {
  assert.deepEqual(parseFlowDocument(serializeFlowDocument(editor)), editor);
});

test('supports an empty flow', () => {
  const layout = {
    flowId: checkoutFlow.id,
    positions: {},
  };

  const empty: FlowEditorState = {
    flow: {
      ...checkoutFlow,
      entryNodeId: null,
      nodes: [],
      edges: [],
      codeReferences: [],
    },
    layout,
    initialLayout: layout,
  };

  assert.deepEqual(parseFlowDocument(serializeFlowDocument(empty)), empty);
});

test('rejects malformed JSON and unsupported versions', () => {
  assert.throws(() => parseFlowDocument('{'));
  assert.throws(() => parseFlowDocument(encode(editor, 2)));
});

test('rejects unknown node kinds', () => {
  const invalid = {
    ...editor,
    flow: {
      ...editor.flow,
      nodes: editor.flow.nodes.map((node) => ({
        ...node,
        kind: 'unknown',
      })),
    },
  };

  assert.throws(() => parseFlowDocument(encode(invalid)));
});

test('rejects a missing entry node', () => {
  const invalid = {
    ...editor,
    flow: {
      ...editor.flow,
      entryNodeId: 'missing-node',
    },
  };

  assert.throws(() => parseFlowDocument(encode(invalid)));
});

test('rejects missing reset positions', () => {
  const invalid = {
    ...editor,
    initialLayout: {
      flowId: editor.flow.id,
      positions: {},
    },
  };

  assert.throws(() => parseFlowDocument(encode(invalid)));
});

test('rejects non-finite coordinates before serialization', () => {
  const invalid: FlowEditorState = {
    ...editor,
    layout: {
      ...editor.layout,
      positions: {
        ...editor.layout.positions,
        'checkout-screen': { x: Infinity, y: 0 },
      },
    },
  };

  assert.throws(() => serializeFlowDocument(invalid));
});

test('accepts a document for the expected flow', () => {
  const serialized = serializeFlowDocument(editor);

  assert.deepEqual(parseFlowDocument(serialized, editor.flow.id), editor);
});

test('rejects a document for a different flow', () => {
  const serialized = serializeFlowDocument(editor);

  assert.throws(
    () => parseFlowDocument(serialized, 'another-flow'),
    /Document belongs to another flow/,
  );
});

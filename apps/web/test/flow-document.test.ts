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
  scenarios: [
    { id: 'happy-path', flowId: 'checkout', name: 'Happy path', overrides: [] },
    {
      id: 'order-error',
      flowId: 'checkout',
      name: 'Order error',
      overrides: [{
        flowNodeId: 'create-order',
        outcome: { kind: 'failure', code: 'DECLINED', httpStatus: 402 },
      }],
    },
  ],
};

function encode(value: unknown, version = 2): string {
  return JSON.stringify({ version, editor: value });
}

test('preserves the flow, layouts and scenarios in version 2', () => {
  assert.equal(JSON.parse(serializeFlowDocument(editor)).version, 2);
  assert.deepEqual(parseFlowDocument(serializeFlowDocument(editor)), editor);
});

test('opens a version 1 document with no scenarios', () => {
  const { scenarios: _scenarios, ...legacyEditor } = editor;

  assert.deepEqual(parseFlowDocument(encode(legacyEditor, 1)), {
    ...legacyEditor,
    scenarios: [],
  });
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
    scenarios: [],
  };

  assert.deepEqual(parseFlowDocument(serializeFlowDocument(empty)), empty);
});

test('rejects malformed JSON and unsupported versions', () => {
  assert.throws(() => parseFlowDocument('{'));
  assert.throws(() => parseFlowDocument(encode(editor, 3)));
});

test('rejects duplicate scenario IDs and invalid scenario references', () => {
  const first = editor.scenarios[0]!;
  const second = editor.scenarios[1]!;

  assert.throws(() => parseFlowDocument(encode({
    ...editor,
    scenarios: [first, { ...second, id: first.id }],
  })));
  assert.throws(() => parseFlowDocument(encode({
    ...editor,
    scenarios: [{ ...first, flowId: 'another-flow' }],
  })));
  assert.throws(() => parseFlowDocument(encode({
    ...editor,
    scenarios: [{ ...first, overrides: [{
      flowNodeId: 'payment-form',
      outcome: { kind: 'failure', code: null, httpStatus: null },
    }] }],
  })));
  assert.throws(() => parseFlowDocument(encode({
    ...editor,
    scenarios: [{ ...second, overrides: [...second.overrides, ...second.overrides] }],
  })));
});

test('rejects malformed scenario outcome fields', () => {
  const scenario = editor.scenarios[1]!;
  const override = scenario.overrides[0]!;

  for (const outcome of [
    { ...override.outcome, kind: 'timeout' },
    { ...override.outcome, code: '' },
    { ...override.outcome, httpStatus: 700 },
  ]) {
    assert.throws(() => parseFlowDocument(encode({
      ...editor,
      scenarios: [{ ...scenario, overrides: [{ ...override, outcome }] }],
    })));
  }
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

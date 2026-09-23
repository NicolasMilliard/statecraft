import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteFlowElements } from '../src/editor/delete-flow-elements.ts';
import {
  parseFlowDocument,
  serializeFlowDocument,
} from '../src/editor/flow-document.ts';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';

const editor: FlowEditorState = {
  flow: {
    ...checkoutFlow,
    codeReferences: [
      {
        id: 'screen-ref',
        flowNodeId: 'checkout-screen',
        repositoryId: 'app',
        codeEntityId: 'checkout-component',
        role: 'primary',
      },
      {
        id: 'service-ref',
        flowNodeId: 'create-order',
        repositoryId: 'app',
        codeEntityId: 'create-order-function',
        role: 'primary',
      },
    ],
  },
  layout: {
    ...checkoutLayout,
    positions: {
      ...checkoutLayout.positions,
      'create-order': { x: 800, y: 300 },
    },
  },
  initialLayout: checkoutLayout,
};

test('deletes a mixed selection while preserving a valid document and the previous state', () => {
  const before = structuredClone(editor);

  const next = deleteFlowElements(
    editor,
    ['checkout-screen', 'submit-order'],
    ['order-failure'],
  );

  assert.deepEqual(
    next.flow.nodes.map((node) => node.id),
    ['payment-form', 'create-order', 'order-confirmed', 'order-error'],
  );
  assert.deepEqual(
    next.flow.edges.map((edge) => edge.id),
    ['order-success'],
  );
  assert.equal(next.flow.entryNodeId, null);
  assert.deepEqual(
    next.flow.codeReferences.map((reference) => reference.id),
    ['service-ref'],
  );

  assert.deepEqual(next.layout.positions['create-order'], {
    x: 800,
    y: 300,
  });
  assert.deepEqual(next.initialLayout.positions['create-order'], {
    x: 720,
    y: 120,
  });

  assert.deepEqual(parseFlowDocument(serializeFlowDocument(next)), next);
  assert.deepEqual(editor, before);
});

test('deleting connections preserves nodes, references and layouts', () => {
  const next = deleteFlowElements(
    editor,
    [],
    ['order-success', 'order-failure'],
  );

  assert.deepEqual(
    next.flow.edges.map((edge) => edge.id),
    ['checkout-to-form', 'form-to-submit', 'submit-to-service'],
  );
  assert.deepEqual(next.flow.nodes, editor.flow.nodes);
  assert.equal(next.flow.entryNodeId, editor.flow.entryNodeId);
  assert.deepEqual(next.flow.codeReferences, editor.flow.codeReferences);
  assert.deepEqual(next.layout, editor.layout);
  assert.deepEqual(next.initialLayout, editor.initialLayout);
});

test('empty or unknown selections leave the editor unchanged', () => {
  assert.equal(deleteFlowElements(editor, [], []), editor);
  assert.equal(
    deleteFlowElements(editor, ['missing-node'], ['missing-edge']),
    editor,
  );
});

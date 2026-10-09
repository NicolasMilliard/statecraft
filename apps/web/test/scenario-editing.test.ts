import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addScenario,
  duplicateScenario,
  removeScenario,
  renameScenario,
  setScenarioOverride,
} from '../src/editor/scenario-editing.ts';
import type { FlowEditorState } from '../src/editor/flow-editor-state.ts';
import {
  parseFlowDocument,
  serializeFlowDocument,
} from '../src/editor/flow-document.ts';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';

function createEditor(): FlowEditorState {
  return {
    flow: checkoutFlow,
    layout: checkoutLayout,
    initialLayout: checkoutLayout,
    scenarios: [],
  };
}

test('creates, renames, duplicates and removes scenarios without changing earlier states', () => {
  const initial = createEditor();
  const created = addScenario(initial, 'happy', '  Happy path  ');
  const renamed = renameScenario(created, 'happy', '  Normal order  ');
  const duplicated = duplicateScenario(renamed, 'happy', 'copy');
  const removed = removeScenario(duplicated, 'happy');

  assert.deepEqual(initial.scenarios, []);
  assert.deepEqual(created.scenarios, [{
    id: 'happy', flowId: 'checkout', name: 'Happy path', overrides: [],
  }]);
  assert.equal(renamed.scenarios[0]?.name, 'Normal order');
  assert.equal(duplicated.scenarios[1]?.name, 'Normal order copy');
  assert.deepEqual(removed.scenarios.map((scenario) => scenario.id), ['copy']);
  assert.deepEqual(parseFlowDocument(serializeFlowDocument(duplicated)), duplicated);

  assert.equal(addScenario(created, 'happy'), created);
  assert.equal(addScenario(created, 'other', '  '), created);
  assert.equal(renameScenario(created, 'happy', ''), created);
  assert.equal(renameScenario(created, 'missing', 'Other'), created);
  assert.equal(duplicateScenario(created, 'missing', 'other'), created);
  assert.equal(duplicateScenario(created, 'happy', 'happy'), created);
  assert.equal(removeScenario(created, 'missing'), created);
});

test('adds, changes and clears a Service override while keeping history states independent', () => {
  const created = addScenario(createEditor(), 'error');
  const failure = setScenarioOverride(created, 'error', 'create-order', {
    kind: 'failure', code: '  PAYMENT_DECLINED  ', httpStatus: 402,
  });
  const success = setScenarioOverride(failure, 'error', 'create-order', {
    kind: 'success', code: null, httpStatus: null,
  });
  const cleared = setScenarioOverride(success, 'error', 'create-order', null);

  assert.deepEqual(created.scenarios[0]?.overrides, []);
  assert.deepEqual(failure.scenarios[0]?.overrides, [{
    flowNodeId: 'create-order',
    outcome: { kind: 'failure', code: 'PAYMENT_DECLINED', httpStatus: 402 },
  }]);
  assert.deepEqual(success.scenarios[0]?.overrides, [{
    flowNodeId: 'create-order',
    outcome: { kind: 'success', code: null, httpStatus: null },
  }]);
  assert.deepEqual(cleared.scenarios[0]?.overrides, []);
  assert.deepEqual(parseFlowDocument(serializeFlowDocument(failure)), failure);
  assert.equal(setScenarioOverride(cleared, 'error', 'create-order', null), cleared);
});

test('rejects edits to missing or non-Service nodes and invalid statuses', () => {
  const editor = addScenario(createEditor(), 'error');
  const outcome = { kind: 'failure' as const, code: null, httpStatus: 500 };

  assert.equal(setScenarioOverride(editor, 'missing', 'create-order', outcome), editor);
  assert.equal(setScenarioOverride(editor, 'error', 'missing', outcome), editor);
  assert.equal(setScenarioOverride(editor, 'error', 'payment-form', outcome), editor);
  assert.equal(setScenarioOverride(editor, 'error', 'create-order', {
    ...outcome, httpStatus: 700,
  }), editor);
});

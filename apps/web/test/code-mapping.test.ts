import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CodeGraph } from '@statecraft/core';
import { resolveCodeReference } from '@statecraft/core';
import {
  attachCodeEntity,
  removeCodeReference,
  setCodeReferenceRole,
} from '../src/editor/code-mapping.ts';
import {
  parseFlowDocument,
  serializeFlowDocument,
} from '../src/editor/flow-document.ts';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';

const graph: CodeGraph = {
  repositoryId: 'storefront',
  entities: [{
    id: 'checkout-component',
    kind: 'component',
    name: 'Checkout',
    filePath: 'src/Checkout.tsx',
    symbol: 'Checkout',
    structuralHash: 'a'.repeat(64),
  }],
  relations: [],
};

test('attaches an explicit reference and preserves it in a Flow export', () => {
  const linked = attachCodeEntity(
    checkoutFlow,
    graph,
    'checkout-screen',
    'checkout-component',
    'primary',
    'checkout-reference',
  );

  assert.deepEqual(linked.codeReferences, [{
    id: 'checkout-reference',
    flowNodeId: 'checkout-screen',
    repositoryId: 'storefront',
    codeEntityId: 'checkout-component',
    role: 'primary',
  }]);

  const restored = parseFlowDocument(serializeFlowDocument({
    flow: linked,
    layout: checkoutLayout,
    initialLayout: checkoutLayout,
  }));

  assert.deepEqual(restored.flow.codeReferences, linked.codeReferences);
  const reference = restored.flow.codeReferences[0]!;
  assert.equal(resolveCodeReference(reference, graph).status, 'resolved');
  assert.equal(resolveCodeReference(reference, null).status, 'graph_unavailable');
  assert.equal(
    resolveCodeReference(reference, { ...graph, entities: [] }).status,
    'not_found',
  );
});

test('prevents duplicate or invalid links while allowing one entity on multiple nodes', () => {
  const linked = attachCodeEntity(
    checkoutFlow, graph, 'checkout-screen', 'checkout-component', 'primary', 'first',
  );

  assert.equal(
    attachCodeEntity(linked, graph, 'checkout-screen', 'checkout-component', 'dependency', 'duplicate'),
    linked,
  );
  assert.equal(
    attachCodeEntity(linked, graph, 'payment-form', 'checkout-component', 'dependency', 'first'),
    linked,
  );
  assert.equal(
    attachCodeEntity(linked, graph, 'missing-node', 'checkout-component', 'primary', 'missing-node-ref'),
    linked,
  );
  assert.equal(
    attachCodeEntity(linked, graph, 'checkout-screen', 'missing-entity', 'primary', 'missing-entity-ref'),
    linked,
  );

  const shared = attachCodeEntity(
    linked, graph, 'payment-form', 'checkout-component', 'dependency', 'second',
  );
  assert.equal(shared.codeReferences.length, 2);
});

test('changes a role or unlinks without changing other references', () => {
  const linked = attachCodeEntity(
    checkoutFlow, graph, 'checkout-screen', 'checkout-component', 'primary', 'first',
  );
  const changed = setCodeReferenceRole(linked, 'first', 'dependency');

  assert.equal(changed.codeReferences[0]?.role, 'dependency');
  assert.equal(setCodeReferenceRole(changed, 'first', 'dependency'), changed);
  assert.equal(setCodeReferenceRole(changed, 'missing', 'primary'), changed);
  assert.equal(removeCodeReference(changed, 'missing'), changed);
  assert.deepEqual(removeCodeReference(changed, 'first').codeReferences, []);
  assert.equal(linked.codeReferences[0]?.role, 'primary');
});

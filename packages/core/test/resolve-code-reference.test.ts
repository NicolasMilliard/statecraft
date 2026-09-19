import {
  resolveCodeReference,
  type CodeGraph,
  type CodeReference,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createReference(): CodeReference {
  return {
    id: 'checkout-payment-form',
    flowNodeId: 'payment',
    repositoryId: 'storefront',
    codeEntityId: 'payment-form',
    role: 'primary',
  };
}

function createCodeGraph(): CodeGraph {
  return {
    repositoryId: 'storefront',
    entities: [
      {
        id: 'payment-form',
        kind: 'component',
        name: 'PaymentForm',
        filePath: 'src/PaymentForm.tsx',
        symbol: 'PaymentForm',
        structuralHash: 'payment-form-v1',
      },
    ],
    relations: [],
  };
}

test('resolves an entity in the matching repository', () => {
  const graph = createCodeGraph();
  const [entity] = graph.entities;

  assert.ok(entity);

  assert.deepEqual(resolveCodeReference(createReference(), graph), {
    status: 'resolved',
    entity,
  });
});

test('preserves a reference when its entity is not found', () => {
  const reference = createReference();
  const before = structuredClone(reference);

  const graph: CodeGraph = {
    ...createCodeGraph(),
    entities: [],
  };

  assert.deepEqual(resolveCodeReference(reference, graph), {
    status: 'not_found',
  });

  assert.deepEqual(reference, before);
});

test('reports an unavailable graph when none is provided', () => {
  assert.deepEqual(resolveCodeReference(createReference(), null), {
    status: 'graph_unavailable',
  });
});

test('does not resolve an identical entity ID from another repository', () => {
  const graph: CodeGraph = {
    ...createCodeGraph(),
    repositoryId: 'another-repository',
  };

  assert.deepEqual(resolveCodeReference(createReference(), graph), {
    status: 'graph_unavailable',
  });
});

test('does not guess a match from an entity name or file path', () => {
  const graph = createCodeGraph();

  const differentEntityGraph: CodeGraph = {
    ...graph,
    entities: graph.entities.map((entity) => ({
      ...entity,
      id: 'another-entity',
    })),
  };

  assert.deepEqual(
    resolveCodeReference(createReference(), differentEntityGraph),
    { status: 'not_found' },
  );
});

test('does not modify the reference or the code graph', () => {
  const reference = createReference();
  const graph = createCodeGraph();
  const before = structuredClone({ reference, graph });

  resolveCodeReference(reference, graph);

  assert.deepEqual({ reference, graph }, before);
});

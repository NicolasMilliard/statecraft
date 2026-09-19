import { validateCodeGraph, type CodeGraph } from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

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
      },
      {
        id: 'create-order',
        kind: 'function',
        name: 'createOrder',
        filePath: 'src/create-order.ts',
        symbol: 'createOrder',
      },
    ],
    relations: [
      {
        id: 'form-calls-order',
        kind: 'calls',
        sourceEntityId: 'payment-form',
        targetEntityId: 'create-order',
      },
    ],
  };
}

test('accepts a consistent code graph', () => {
  assert.deepEqual(validateCodeGraph(createCodeGraph()), []);
});

test('accepts an empty code graph', () => {
  const graph: CodeGraph = {
    ...createCodeGraph(),
    entities: [],
    relations: [],
  };

  assert.deepEqual(validateCodeGraph(graph), []);
});

test('reports duplicate entity and relation identifiers', () => {
  const graph = createCodeGraph();
  const [entity] = graph.entities;
  const [relation] = graph.relations;

  assert.ok(entity);
  assert.ok(relation);

  const issues = validateCodeGraph({
    ...graph,
    entities: [...graph.entities, entity],
    relations: [...graph.relations, relation],
  });

  assert.deepEqual(issues, [
    { code: 'duplicate_entity_id', entityId: 'payment-form' },
    {
      code: 'duplicate_relation_id',
      relationId: 'form-calls-order',
    },
  ]);
});

test('reports both missing endpoints of a relation', () => {
  const graph: CodeGraph = {
    ...createCodeGraph(),
    relations: [
      {
        id: 'broken-relation',
        kind: 'calls',
        sourceEntityId: 'missing-source',
        targetEntityId: 'missing-target',
      },
    ],
  };

  assert.deepEqual(validateCodeGraph(graph), [
    {
      code: 'relation_source_not_found',
      relationId: 'broken-relation',
      entityId: 'missing-source',
    },
    {
      code: 'relation_target_not_found',
      relationId: 'broken-relation',
      entityId: 'missing-target',
    },
  ]);
});

test('accepts recursive calls and disconnected entities', () => {
  const graph = createCodeGraph();

  const issues = validateCodeGraph({
    ...graph,
    entities: [
      ...graph.entities,
      {
        id: 'unused',
        kind: 'function',
        name: 'unused',
        filePath: 'src/unused.ts',
        symbol: 'unused',
      },
    ],
    relations: [
      ...graph.relations,
      {
        id: 'recursive-call',
        kind: 'calls',
        sourceEntityId: 'create-order',
        targetEntityId: 'create-order',
      },
    ],
  });

  assert.deepEqual(issues, []);
});

test('does not modify the input code graph', () => {
  const graph = createCodeGraph();
  const before = structuredClone(graph);

  validateCodeGraph(graph);

  assert.deepEqual(graph, before);
});

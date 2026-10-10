import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SnapshotDocument } from '@statecraft/core';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';
import { serializeFlowDocument } from '../src/editor/flow-document.ts';
import { parseOpenDocument } from '../src/editor/open-document.ts';

const document: SnapshotDocument = {
  formatVersion: 1,
  snapshot: {
    id: 'c'.repeat(64),
    capturedAt: '2026-10-10T10:00:00.000Z',
    git: { commitSha: 'd'.repeat(40), isDirty: false },
    analysisProfileId: 'react-ts-v1',
    graph: {
    repositoryId: 'storefront',
    entities: [
      {
        id: 'route:src/routes/checkout.tsx#Route',
        kind: 'route',
        name: '/checkout',
        filePath: 'src/routes/checkout.tsx',
        symbol: 'Route',
        structuralHash: 'a'.repeat(64),
      },
      {
        id: 'component:src/pages/CheckoutPage.tsx#CheckoutPage',
        kind: 'component',
        name: 'CheckoutPage',
        filePath: 'src/pages/CheckoutPage.tsx',
        symbol: 'CheckoutPage',
        structuralHash: 'b'.repeat(64),
      },
    ],
    relations: [
      {
        id: 'renders:route-to-component',
        kind: 'renders',
        sourceEntityId: 'route:src/routes/checkout.tsx#Route',
        targetEntityId: 'component:src/pages/CheckoutPage.tsx#CheckoutPage',
      },
    ],
    },
  },
  diagnostics: [
    {
      code: 'unsupported_route_options',
      filePath: 'src/routes/dynamic.tsx',
      message: 'Could not resolve direct route options.',
    },
  ],
};

test('identifies and validates a Flow export', () => {
  const editor = {
    flow: checkoutFlow,
    layout: checkoutLayout,
    initialLayout: checkoutLayout,
    scenarios: [],
  };

  assert.deepEqual(parseOpenDocument(serializeFlowDocument(editor)), {
    kind: 'flow',
    editor,
  });
});

test('identifies and validates a repository snapshot', () => {
  assert.deepEqual(parseOpenDocument(JSON.stringify(document)), {
    kind: 'snapshot',
    document,
  });
});

test('rejects malformed, unknown and ambiguous documents', () => {
  assert.throws(() => parseOpenDocument('{'));
  assert.throws(() => parseOpenDocument(JSON.stringify({ graph: document.snapshot.graph })));
  assert.throws(() => parseOpenDocument(JSON.stringify({ ...document, version: 1 })));
  assert.throws(() => parseOpenDocument(JSON.stringify({ ...document, formatVersion: 2 })));
  assert.throws(() => parseOpenDocument(JSON.stringify({ ...document, snapshot: { ...document.snapshot, git: { commitSha: 'invalid', isDirty: false } } })));
});

test('rejects invalid snapshot fields and code graphs', () => {
  assert.throws(() => parseOpenDocument(JSON.stringify({
    ...document,
    snapshot: { ...document.snapshot, graph: { ...document.snapshot.graph, entities: [document.snapshot.graph.entities[0], document.snapshot.graph.entities[0]] } },
  })));

  assert.throws(() => parseOpenDocument(JSON.stringify({
    ...document,
    snapshot: { ...document.snapshot, graph: {
      ...document.snapshot.graph,
      relations: [{ ...document.snapshot.graph.relations[0], targetEntityId: 'missing' }],
    } },
  })));

  assert.throws(() => parseOpenDocument(JSON.stringify({
    ...document,
    snapshot: { ...document.snapshot, graph: {
      ...document.snapshot.graph,
      entities: [{ ...document.snapshot.graph.entities[0], structuralHash: 'not-a-hash' }],
    },
    },
  })));
});

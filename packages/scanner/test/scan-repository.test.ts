import { validateCodeGraph } from '@statecraft/core';
import { scanRepository } from '@statecraft/scanner';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('../../../examples/storefront/', import.meta.url));

test('detects the Checkout route, component, hook, query, mutation, and service chain', () => {
  const report = scanRepository({
    repositoryPath: fixture,
    repositoryId: 'storefront',
  });

  assert.equal(report.formatVersion, 1);
  assert.equal(report.analysisProfileId, 'react-ts-v0.2');
  assert.deepEqual(validateCodeGraph(report.graph), []);
  assert.deepEqual(
    report.graph.entities.map(({ kind, name }) => ({ kind, name })),
    [
      { kind: 'component', name: 'CheckoutForm' },
      { kind: 'component', name: 'CheckoutPage' },
      { kind: 'function', name: 'getCart' },
      { kind: 'function', name: 'createOrder' },
      { kind: 'hook', name: 'useCheckout' },
      { kind: 'mutation', name: 'createOrder' },
      { kind: 'query', name: 'cart' },
      { kind: 'route', name: '/checkout' },
    ],
  );

  const names = new Map(report.graph.entities.map((entity) => [entity.id, entity.kind + ':' + entity.name]));
  assert.deepEqual(
    report.graph.relations.map((relation) => [
      names.get(relation.sourceEntityId),
      relation.kind,
      names.get(relation.targetEntityId),
    ]).sort(),
    [
      ['component:CheckoutPage', 'renders', 'component:CheckoutForm'],
      ['component:CheckoutForm', 'uses', 'hook:useCheckout'],
      ['hook:useCheckout', 'uses', 'query:cart'],
      ['hook:useCheckout', 'uses', 'mutation:createOrder'],
      ['query:cart', 'calls', 'function:getCart'],
      ['mutation:createOrder', 'calls', 'function:createOrder'],
      ['route:/checkout', 'renders', 'component:CheckoutPage'],
    ].sort(),
  );
  assert.deepEqual(report.diagnostics.map((diagnostic) => diagnostic.code), [
    'partial_coverage',
  ]);
});

test('is stable across scans, checkout paths, and formatting changes', () => {
  const original = scanRepository({
    repositoryPath: fixture,
    repositoryId: 'storefront',
  });
  assert.deepEqual(scanRepository({
    repositoryPath: fixture,
    repositoryId: 'storefront',
  }), original);

  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const pagePath = join(copied, 'src/pages/CheckoutPage.tsx');
    const source = readFileSync(pagePath, 'utf8');
    writeFileSync(pagePath, source.replace('  return (', '  // Formatting only\n\n  return ('));

    assert.deepEqual(scanRepository({
      repositoryPath: copied,
      repositoryId: 'storefront',
    }), original);
    assert.ok(!JSON.stringify(original).includes(copied));

    writeFileSync(pagePath, source.replace('<h1>Checkout</h1>', '<h1>Review order</h1>'));
    const changed = scanRepository({
      repositoryPath: copied,
      repositoryId: 'storefront',
    });
    const beforePage = original.graph.entities.find((entity) => entity.name === 'CheckoutPage');
    const afterPage = changed.graph.entities.find((entity) => entity.name === 'CheckoutPage');
    assert.ok(beforePage && afterPage);
    assert.equal(afterPage.id, beforePage.id);
    assert.notEqual(afterPage.structuralHash, beforePage.structuralHash);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('rejects invalid inputs and syntax errors without returning a graph', () => {
  assert.throws(() => scanRepository({
    repositoryPath: fixture,
    repositoryId: '',
  }), /Repository ID/);
  assert.throws(() => scanRepository({
    repositoryPath: fixture,
    repositoryId: 'storefront',
    tsconfigPath: 'missing.json',
  }), /tsconfig/);

  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-invalid-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    writeFileSync(join(copied, 'src/routes/checkout.tsx'), 'export const = ;\n');
    assert.throws(() => scanRepository({
      repositoryPath: copied,
      repositoryId: 'storefront',
    }), /syntax errors/);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('does not classify a function from JSX returned only by a nested callback', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-nested-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    writeFileSync(
      join(copied, 'src/pages/Nested.tsx'),
      'export function Nested() { const render = () => <span />; void render; return null; }\n',
    );
    const report = scanRepository({
      repositoryPath: copied,
      repositoryId: 'storefront',
    });
    assert.equal(report.graph.entities.some((entity) => entity.name === 'Nested'), false);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('includes local files reached through imports when tsconfig lists only the route', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-imports-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    writeFileSync(
      join(copied, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          noEmit: true,
        },
        files: ['src/routes/checkout.tsx'],
      }),
    );
    const report = scanRepository({
      repositoryPath: copied,
      repositoryId: 'storefront',
    });
    assert.equal(report.graph.entities.length, 8);
    assert.equal(report.graph.relations.length, 7);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('follows aliased local function calls transitively', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-callables-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    writeFileSync(
      join(copied, 'src/services/formatCart.ts'),
      [
        'export function normalizeCartId(id: string) { return id.trim(); }',
        'export function formatCart(id: string) { return normalizeCartId(id).toUpperCase(); }',
      ].join('\n'),
    );
    const formPath = join(copied, 'src/components/CheckoutForm.tsx');
    const form = readFileSync(formPath, 'utf8');
    writeFileSync(
      formPath,
      form
        .replace(
          "import { useCheckout as useCheckoutFlow } from '../hooks/useCheckout';",
          "import { useCheckout as useCheckoutFlow } from '../hooks/useCheckout';\nimport { formatCart as renderCartLabel } from '../services/formatCart';",
        )
        .replace(
          '  const { cart, createOrder } = useCheckoutFlow();',
          "  const { cart, createOrder } = useCheckoutFlow();\n  const label = renderCartLabel(cart.data?.id ?? '');\n  void label;",
        ),
    );

    const report = scanRepository({
      repositoryPath: copied,
      repositoryId: 'storefront',
    });
    assert.deepEqual(validateCodeGraph(report.graph), []);
    const names = new Map(report.graph.entities.map((entity) => [entity.id, entity.kind + ':' + entity.name]));
    assert.deepEqual(
      report.graph.relations
        .filter((relation) => relation.kind === 'calls')
        .map((relation) => [
          names.get(relation.sourceEntityId),
          names.get(relation.targetEntityId),
        ])
        .sort(),
      [
        ['component:CheckoutForm', 'function:formatCart'],
        ['function:formatCart', 'function:normalizeCartId'],
        ['query:cart', 'function:getCart'],
        ['mutation:createOrder', 'function:createOrder'],
      ].sort(),
    );
    assert.equal(report.graph.entities.length, 10);
    assert.equal(report.graph.relations.length, 9);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('does not mistake a local useQuery function for the TanStack API', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-local-query-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    writeFileSync(
      join(copied, 'src/components/LocalQuery.tsx'),
      'function useQuery() { return 1; }\nexport function LocalQuery() { useQuery(); return <span />; }\n',
    );
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(
      report.graph.entities.filter((entity) => entity.kind === 'query').length,
      1,
    );
    assert.ok(report.graph.entities.some((entity) =>
      entity.kind === 'hook' && entity.name === 'useQuery',
    ));
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('resolves an aliased query function to its local declaration', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-query-alias-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const hookPath = join(copied, 'src/hooks/useCheckout.ts');
    const source = readFileSync(hookPath, 'utf8');
    writeFileSync(hookPath, source
      .replace("import { getCart } from '../services/cart';", "import { getCart as loadCart } from '../services/cart';")
      .replace('queryFn: getCart,', 'queryFn: loadCart,'));
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    const entities = new Map(report.graph.entities.map((entity) => [entity.id, entity]));
    assert.ok(report.graph.relations.some((relation) =>
      relation.kind === 'calls' &&
      entities.get(relation.sourceEntityId)?.kind === 'query' &&
      entities.get(relation.targetEntityId)?.name === 'getCart',
    ));
    assert.deepEqual(report.diagnostics.map((diagnostic) => diagnostic.code), ['partial_coverage']);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('reports unsupported query options without inventing a query', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-query-options-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const hookPath = join(copied, 'src/hooks/useCheckout.ts');
    const source = readFileSync(hookPath, 'utf8');
    writeFileSync(hookPath, source.replace(
      "  const cart = useCartQuery({\n    queryKey: ['cart'],\n    queryFn: getCart,\n  });",
      "  const options = { queryKey: ['cart'], queryFn: getCart };\n  const cart = useCartQuery(options);",
    ));
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(report.graph.entities.some((entity) => entity.kind === 'query'), false);
    assert.equal(report.graph.entities.some((entity) => entity.name === 'getCart'), false);
    assert.deepEqual(report.diagnostics.map((diagnostic) => diagnostic.code), [
      'unsupported_query_options',
      'partial_coverage',
    ]);

    writeFileSync(hookPath, source.replace(
      '    queryFn: getCart,',
      '    queryFn: getCart,\n    ...overrides,',
    ));
    const spreadReport = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(spreadReport.graph.entities.some((entity) => entity.kind === 'query'), false);
    assert.equal(spreadReport.diagnostics[0]?.code, 'unsupported_query_options');
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

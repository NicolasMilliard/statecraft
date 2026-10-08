import { validateCodeGraph } from '@statecraft/core';
import { scanRepository } from '@statecraft/scanner';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('../../../examples/storefront/', import.meta.url));

test('detects the complete Checkout route-to-HTTP chain', () => {
  const report = scanRepository({
    repositoryPath: fixture,
    repositoryId: 'storefront',
  });

  assert.equal(report.formatVersion, 1);
  assert.equal(report.analysisProfileId, 'react-ts-v1');
  assert.deepEqual(validateCodeGraph(report.graph), []);
  assert.deepEqual(
    report.graph.entities.map(({ kind, name }) => ({ kind, name })),
    [
      { kind: 'component', name: 'CheckoutForm' },
      { kind: 'component', name: 'CheckoutPage' },
      { kind: 'endpoint', name: 'GET /api/cart' },
      { kind: 'endpoint', name: 'POST /api/orders' },
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
      ['function:getCart', 'calls', 'endpoint:GET /api/cart'],
      ['function:createOrder', 'calls', 'endpoint:POST /api/orders'],
      ['route:/checkout', 'renders', 'component:CheckoutPage'],
    ].sort(),
  );
  assert.deepEqual(report.diagnostics, []);
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

    writeFileSync(pagePath, source);
    const ordersPath = join(copied, 'src/services/orders.ts');
    const orders = readFileSync(ordersPath, 'utf8');
    writeFileSync(ordersPath, orders.replace('return response.data;', 'return { ...response.data };'));
    const changedOrder = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    const beforeOrder = original.graph.entities.find((entity) => entity.kind === 'function' && entity.name === 'createOrder');
    const afterOrder = changedOrder.graph.entities.find((entity) => entity.kind === 'function' && entity.name === 'createOrder');
    assert.ok(beforeOrder && afterOrder);
    assert.equal(afterOrder.id, beforeOrder.id);
    assert.notEqual(afterOrder.structuralHash, beforeOrder.structuralHash);
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

test('reports unsupported route forms without inventing a route', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-route-options-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const routePath = join(copied, 'src/routes/checkout.tsx');
    const source = readFileSync(routePath, 'utf8');
    const cases = [
      ["createFileRoute('/checkout')", 'createFileRoute(path)', 'unsupported_route_path'],
      ['({ component: Page })', '(options)', 'unsupported_route_options'],
      ['component: Page', 'component: Missing', 'unsupported_route_component'],
    ] as const;
    for (const [before, after, code] of cases) {
      writeFileSync(routePath, source.replace(before, after));
      const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
      assert.equal(report.graph.entities.some((entity) => entity.kind === 'route'), false);
      assert.equal(report.diagnostics[0]?.code, code);
      assert.equal(report.diagnostics[0]?.filePath, 'src/routes/checkout.tsx');
    }
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('does not classify a same-named local route factory as TanStack Router', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-local-route-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    writeFileSync(join(copied, 'src/routes/local.tsx'), [
      'function createFileRoute(path: string) { return (options: object) => ({ path, options }); }',
      "export const LocalRoute = createFileRoute('/local')({ component: () => <span /> });",
    ].join('\n'));
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(report.graph.entities.filter((entity) => entity.kind === 'route').length, 1);
    assert.equal(report.diagnostics.some((diagnostic) => diagnostic.code.startsWith('unsupported_route_')), false);
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
    assert.equal(report.graph.entities.length, 10);
    assert.equal(report.graph.relations.length, 9);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('excludes generated TypeScript sources selected by the project', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-generated-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    mkdirSync(join(copied, 'src/generated'));
    writeFileSync(join(copied, 'src/generated/Ghost.tsx'),
      'export function GeneratedGhost() { return <div />; }\n');
    writeFileSync(join(copied, 'src/routes/routeTree.gen.tsx'),
      'export function GeneratedTree() { return <div />; }\n');
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(report.graph.entities.some((entity) => entity.name.startsWith('Generated')), false);
    assert.equal(report.graph.entities.length, 10);
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
        ['function:getCart', 'endpoint:GET /api/cart'],
        ['function:createOrder', 'endpoint:POST /api/orders'],
      ].sort(),
    );
    assert.equal(report.graph.entities.length, 12);
    assert.equal(report.graph.relations.length, 11);
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
    assert.deepEqual(report.diagnostics, []);
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

test('does not classify a local fetch function as the global HTTP API', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-local-fetch-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const cartPath = join(copied, 'src/services/cart.ts');
    writeFileSync(cartPath, 'function fetch(path: string) { return { json: () => ({ id: path }) }; }\n' + readFileSync(cartPath, 'utf8'));
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(report.graph.entities.some((entity) => entity.name === 'GET /api/cart'), false);
    assert.ok(report.graph.entities.some((entity) => entity.kind === 'function' && entity.name === 'fetch'));
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('resolves an aliased Axios import and normalizes a static fetch method', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-http-alias-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const ordersPath = join(copied, 'src/services/orders.ts');
    writeFileSync(ordersPath, readFileSync(ordersPath, 'utf8')
      .replace("import axios from 'axios';", "import client from 'axios';")
      .replace('axios.post(', 'client.post('));
    const cartPath = join(copied, 'src/services/cart.ts');
    writeFileSync(cartPath, readFileSync(cartPath, 'utf8')
      .replace("fetch('/api/cart')", "globalThis.fetch('/api/cart', { method: 'pOsT' })"));
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.deepEqual(report.graph.entities
      .filter((entity) => entity.kind === 'endpoint')
      .map((entity) => entity.name), ['POST /api/cart', 'POST /api/orders']);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('reports dynamic HTTP targets and Axios instances without invented endpoints', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-http-dynamic-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const cartPath = join(copied, 'src/services/cart.ts');
    writeFileSync(cartPath, readFileSync(cartPath, 'utf8')
      .replace("fetch('/api/cart')", 'fetch(path)'));
    const ordersPath = join(copied, 'src/services/orders.ts');
    writeFileSync(ordersPath, readFileSync(ordersPath, 'utf8')
      .replace('axios.post(', 'axios.create().post('));
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(report.graph.entities.some((entity) => entity.kind === 'endpoint'), false);
    assert.deepEqual(report.diagnostics.map((diagnostic) => diagnostic.code), [
      'dynamic_http_url',
      'unsupported_axios_call',
    ]);

    const originalCart = readFileSync(join(fixture, 'src/services/cart.ts'), 'utf8');
    writeFileSync(cartPath, originalCart.replace(
      "fetch('/api/cart')",
      "fetch('/api/cart', { method: requestedMethod })",
    ));
    const dynamicMethod = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(dynamicMethod.graph.entities.some((entity) => entity.name === 'GET /api/cart'), false);
    assert.ok(dynamicMethod.diagnostics.some((diagnostic) => diagnostic.code === 'unsupported_fetch_options'));
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

test('reports a module-level Axios instance when its method is reached', () => {
  const copied = mkdtempSync(join(tmpdir(), 'statecraft-scanner-axios-instance-'));
  try {
    cpSync(fixture, copied, { recursive: true });
    const ordersPath = join(copied, 'src/services/orders.ts');
    writeFileSync(ordersPath, readFileSync(ordersPath, 'utf8')
      .replace("import axios from 'axios';", "import axios from 'axios';\nconst client = axios.create();")
      .replace('axios.post(', 'client.post('));
    const report = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(report.graph.entities.some((entity) => entity.name === 'POST /api/orders'), false);
    assert.ok(report.diagnostics.some((diagnostic) =>
      diagnostic.code === 'unsupported_axios_instance' &&
      diagnostic.filePath === 'src/services/orders.ts',
    ));

    mkdirSync(join(copied, 'src/lib'));
    writeFileSync(join(copied, 'src/lib/client.ts'),
      "import axios from 'axios';\nexport const client = axios.create();\n");
    writeFileSync(ordersPath, readFileSync(join(fixture, 'src/services/orders.ts'), 'utf8')
      .replace("import axios from 'axios';", "import { client } from '../lib/client';")
      .replace('axios.post(', 'client.post('));
    const imported = scanRepository({ repositoryPath: copied, repositoryId: 'storefront' });
    assert.equal(imported.graph.entities.some((entity) => entity.name === 'POST /api/orders'), false);
    assert.ok(imported.diagnostics.some((diagnostic) => diagnostic.code === 'unsupported_axios_instance'));
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

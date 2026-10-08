import { validateCodeGraph } from '@statecraft/core';
import { scanRepository } from '@statecraft/scanner';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('../../../examples/storefront/', import.meta.url));

test('detects the route and component rendering chain', () => {
  const report = scanRepository({
    repositoryPath: fixture,
    repositoryId: 'storefront',
  });

  assert.equal(report.formatVersion, 1);
  assert.equal(report.analysisProfileId, 'react-ts-v0');
  assert.deepEqual(validateCodeGraph(report.graph), []);
  assert.deepEqual(
    report.graph.entities.map(({ kind, name }) => ({ kind, name })),
    [
      { kind: 'component', name: 'CheckoutForm' },
      { kind: 'component', name: 'CheckoutPage' },
      { kind: 'route', name: '/checkout' },
    ],
  );

  const names = new Map(report.graph.entities.map((entity) => [entity.id, entity.name]));
  assert.deepEqual(
    report.graph.relations.map((relation) => [
      names.get(relation.sourceEntityId),
      relation.kind,
      names.get(relation.targetEntityId),
    ]).sort(),
    [
      ['CheckoutPage', 'renders', 'CheckoutForm'],
      ['/checkout', 'renders', 'CheckoutPage'],
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
    assert.equal(report.graph.entities.length, 3);
    assert.equal(report.graph.relations.length, 2);
  } finally {
    rmSync(copied, { recursive: true, force: true });
  }
});

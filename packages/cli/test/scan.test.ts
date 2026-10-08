import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('../../../examples/storefront/', import.meta.url));
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));

test('writes a machine-readable report to stdout', () => {
  const result = spawnSync(process.execPath, [
    cli,
    'scan',
    fixture,
    '--repository-id',
    'storefront',
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout) as {
    formatVersion: number;
    graph: { entities: unknown[]; relations: unknown[] };
  };
  assert.equal(report.formatVersion, 1);
  assert.equal(report.graph.entities.length, 8);
  assert.equal(report.graph.relations.length, 7);
});

test('writes to a file when requested', () => {
  const directory = mkdtempSync(join(tmpdir(), 'statecraft-cli-'));
  try {
    const output = join(directory, 'scan.json');
    const result = spawnSync(process.execPath, [
      cli,
      'scan',
      fixture,
      '--repository-id',
      'storefront',
      '--output',
      output,
    ], { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).formatVersion, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('reports bad input on stderr without publishing JSON', () => {
  const result = spawnSync(process.execPath, [
    cli,
    'scan',
    fixture,
    '--repository-id',
    'storefront',
    '--tsconfig',
    'missing.json',
  ], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /tsconfig/);
});

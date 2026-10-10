import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('../../../examples/storefront/', import.meta.url));
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));

test('writes a Git snapshot to stdout', () => {
  const result = spawnSync(process.execPath, [
    cli,
    'scan',
    fixture,
    '--repository-id',
    'storefront',
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const document = JSON.parse(result.stdout) as {
    formatVersion: number;
    snapshot: {
      id: string;
      git: { commitSha: string; isDirty: boolean };
      graph: { entities: unknown[]; relations: unknown[] };
    };
  };
  assert.equal(document.formatVersion, 1);
  assert.match(document.snapshot.id, /^[a-f0-9]{64}$/);
  assert.match(document.snapshot.git.commitSha, /^[a-f0-9]{40,64}$/);
  assert.equal(document.snapshot.graph.entities.length, 10);
  assert.equal(document.snapshot.graph.relations.length, 9);

  const repeated = spawnSync(process.execPath, [
    cli,
    'scan',
    fixture,
    '--repository-id',
    'storefront',
  ], { encoding: 'utf8' });
  assert.equal(repeated.status, 0, repeated.stderr);
  const repeatedDocument = JSON.parse(repeated.stdout) as typeof document;
  assert.equal(repeatedDocument.snapshot.id, document.snapshot.id);
  assert.deepEqual(repeatedDocument.snapshot.graph, document.snapshot.graph);
  assert.ok(!result.stdout.includes('return response.data'));
});

test('writes to a file when requested', () => {
  const directory = mkdtempSync(join(tmpdir(), 'statecraft-cli-'));
  try {
    const output = join(directory, 'snapshot.json');
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
    assert.match(result.stderr, /Repository snapshot saved to /);
    assert.ok(result.stderr.includes(output));
    assert.match(result.stderr, /Open JSON or drag it onto the app/);
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).formatVersion, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('tracks clean and dirty states at one commit without conflating them', () => {
  const directory = mkdtempSync(join(tmpdir(), 'statecraft-snapshot-'));
  const repository = join(directory, 'storefront');
  try {
    cpSync(fixture, repository, { recursive: true });
    const runGit = (...args: string[]) => spawnSync('git', ['-C', repository, ...args], { encoding: 'utf8' });
    assert.equal(runGit('init', '-q').status, 0);
    assert.equal(runGit('add', '.').status, 0);
    assert.equal(runGit('-c', 'user.name=Statecraft Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'baseline').status, 0);
    const scan = () => spawnSync(process.execPath, [cli, 'scan', repository, '--repository-id', 'storefront'], { encoding: 'utf8' });
    const clean = scan();
    assert.equal(clean.status, 0, clean.stderr);
    const before = JSON.parse(clean.stdout) as {
      snapshot: { id: string; git: { commitSha: string; isDirty: boolean }; graph: { entities: { name: string; structuralHash: string }[] } };
    };
    assert.equal(before.snapshot.git.isDirty, false);

    const page = join(repository, 'src/pages/CheckoutPage.tsx');
    writeFileSync(page, readFileSync(page, 'utf8').replace('<h1>Checkout</h1>', '<h1>Review order</h1>'));
    const dirty = scan();
    assert.equal(dirty.status, 0, dirty.stderr);
    const after = JSON.parse(dirty.stdout) as typeof before;
    assert.equal(after.snapshot.git.isDirty, true);
    assert.equal(after.snapshot.git.commitSha, before.snapshot.git.commitSha);
    assert.notEqual(after.snapshot.id, before.snapshot.id);
    assert.notEqual(
      after.snapshot.graph.entities.find((entity) => entity.name === 'CheckoutPage')?.structuralHash,
      before.snapshot.graph.entities.find((entity) => entity.name === 'CheckoutPage')?.structuralHash,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('does not count its output file as a repository change', () => {
  const directory = mkdtempSync(join(tmpdir(), 'statecraft-output-'));
  const repository = join(directory, 'storefront');
  try {
    cpSync(fixture, repository, { recursive: true });
    const runGit = (...args: string[]) => spawnSync('git', ['-C', repository, ...args], { encoding: 'utf8' });
    assert.equal(runGit('init', '-q').status, 0);
    assert.equal(runGit('add', '.').status, 0);
    assert.equal(runGit('-c', 'user.name=Statecraft Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'baseline').status, 0);
    const output = join(repository, 'snapshot.json');
    const scan = () => spawnSync(process.execPath, [
      cli, 'scan', repository, '--repository-id', 'storefront', '--output', output,
    ], { encoding: 'utf8' });
    assert.equal(scan().status, 0);
    const first = JSON.parse(readFileSync(output, 'utf8')) as {
      snapshot: { id: string; git: { isDirty: boolean } };
    };
    assert.equal(scan().status, 0);
    const second = JSON.parse(readFileSync(output, 'utf8')) as typeof first;
    assert.equal(first.snapshot.git.isDirty, false);
    assert.equal(second.snapshot.git.isDirty, false);
    assert.equal(second.snapshot.id, first.snapshot.id);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('requires a Git commit to capture a repository snapshot', () => {
  const directory = mkdtempSync(join(tmpdir(), 'statecraft-no-git-'));
  try {
    cpSync(fixture, directory, { recursive: true });
    const result = spawnSync(process.execPath, [
      cli, 'scan', directory, '--repository-id', 'storefront',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Git working tree with a HEAD commit/);
    assert.equal(result.stdout, '');
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

import {
  diffSnapshotEntities,
  type CodeEntity,
  type SyncSnapshot,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createEntity(
  id: string,
  overrides: Partial<CodeEntity> = {},
): CodeEntity {
  return {
    id,
    kind: 'component',
    name: id,
    filePath: `src/${id}.tsx`,
    symbol: id,
    structuralHash: 'hash-v1',
    ...overrides,
  };
}

function createSnapshot(
  id: string,
  entities: readonly CodeEntity[],
): SyncSnapshot {
  return {
    id,
    capturedAt: '2026-09-19T12:00:00.000Z',
    git: {
      commitSha: 'a'.repeat(40),
      isDirty: false,
    },
    analysisProfileId: 'test-v1',
    graph: {
      repositoryId: 'storefront',
      entities,
      relations: [],
    },
  };
}

function changesBetween(before: SyncSnapshot, after: SyncSnapshot) {
  const result = diffSnapshotEntities(before, after);

  assert.ok(result.status === 'compared');

  return result.changes;
}

test('detects changes at the same commit without modifying snapshots', () => {
  const stable = createEntity('stable');
  const modified = createEntity('modified');

  const before = createSnapshot('before', [
    createEntity('removed'),
    stable,
    modified,
  ]);

  const after: SyncSnapshot = {
    ...createSnapshot('after', [
      stable,
      { ...modified, structuralHash: 'hash-v2' },
      createEntity('added'),
    ]),
    git: {
      ...before.git,
      isDirty: true,
    },
  };

  const original = structuredClone({ before, after });

  assert.deepEqual(diffSnapshotEntities(before, after), {
    status: 'compared',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    changes: [
      { entityId: 'added', kind: 'added' },
      { entityId: 'modified', kind: 'modified' },
      { entityId: 'removed', kind: 'removed' },
    ],
  });

  assert.deepEqual({ before, after }, original);
});

test('ignores entity order and snapshot metadata changes', () => {
  const first = createEntity('first');
  const second = createEntity('second');

  const before = createSnapshot('before', [first, second]);

  const after: SyncSnapshot = {
    ...createSnapshot('after', [second, first]),
    capturedAt: '2026-09-19T13:00:00.000Z',
    git: {
      commitSha: 'b'.repeat(40),
      isDirty: true,
    },
  };

  assert.deepEqual(changesBetween(before, after), []);
});

test('detects entity metadata changes with an unchanged hash', () => {
  const entity = createEntity('entity');

  const updates: readonly Partial<CodeEntity>[] = [
    { kind: 'function' },
    { name: 'AnotherName' },
    { filePath: 'src/moved.tsx' },
    { symbol: null },
  ];

  for (const update of updates) {
    const before = createSnapshot('before', [entity]);
    const after = createSnapshot('after', [{ ...entity, ...update }]);

    assert.deepEqual(
      changesBetween(before, after),
      [{ entityId: 'entity', kind: 'modified' }],
      JSON.stringify(update),
    );
  }
});

test('rejects snapshots from different repositories', () => {
  const before = createSnapshot('before', []);
  const after: SyncSnapshot = {
    ...createSnapshot('after', []),
    graph: {
      repositoryId: 'another-repository',
      entities: [],
      relations: [],
    },
  };

  assert.deepEqual(diffSnapshotEntities(before, after), {
    status: 'incompatible',
    reason: 'repository_mismatch',
  });
});

test('rejects snapshots with different analysis profiles', () => {
  const before = createSnapshot('before', []);
  const after: SyncSnapshot = {
    ...createSnapshot('after', []),
    analysisProfileId: 'test-v2',
  };

  assert.deepEqual(diffSnapshotEntities(before, after), {
    status: 'incompatible',
    reason: 'analysis_profile_mismatch',
  });
});

test('treats a changed entity identifier as removal and addition', () => {
  const entity = createEntity('old');

  const before = createSnapshot('before', [entity]);
  const after = createSnapshot('after', [{ ...entity, id: 'new' }]);

  assert.deepEqual(changesBetween(before, after), [
    { entityId: 'new', kind: 'added' },
    { entityId: 'old', kind: 'removed' },
  ]);
});

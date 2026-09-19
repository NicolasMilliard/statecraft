import {
  diffSnapshotEntities,
  diffSnapshotRelations,
  type CodeEntity,
  type CodeRelation,
  type SyncSnapshot,
} from '@statecraft/core';
import assert from 'node:assert/strict';
import test from 'node:test';

function createRelation(
  id: string,
  overrides: Partial<CodeRelation> = {},
): CodeRelation {
  return {
    id,
    kind: 'calls',
    sourceEntityId: 'form',
    targetEntityId: 'order',
    ...overrides,
  };
}

function createSnapshot(
  id: string,
  relations: readonly CodeRelation[],
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
      entities: ['form', 'order', 'draft'].map(
        (entityId): CodeEntity => ({
          id: entityId,
          kind: 'function',
          name: entityId,
          filePath: `src/${entityId}.ts`,
          symbol: entityId,
          structuralHash: `${entityId}-v1`,
        }),
      ),
      relations,
    },
  };
}

function changesBetween(before: SyncSnapshot, after: SyncSnapshot) {
  const result = diffSnapshotRelations(before, after);

  assert.ok(result.status === 'compared');

  return result.changes;
}

test('detects relation-only changes and preserves both versions', () => {
  const stable = createRelation('stable');
  const modified = createRelation('modified');
  const removed = createRelation('removed');
  const added = createRelation('added', { kind: 'uses' });

  const updated: CodeRelation = {
    ...modified,
    targetEntityId: 'draft',
  };

  const before = createSnapshot('before', [removed, stable, modified]);

  const after = createSnapshot('after', [updated, added, stable]);

  const original = structuredClone({ before, after });

  const entityDiff = diffSnapshotEntities(before, after);

  assert.ok(entityDiff.status === 'compared');
  assert.deepEqual(entityDiff.changes, []);

  assert.deepEqual(diffSnapshotRelations(before, after), {
    status: 'compared',
    repositoryId: 'storefront',
    beforeSnapshotId: 'before',
    afterSnapshotId: 'after',
    changes: [
      {
        relationId: 'added',
        kind: 'added',
        after: added,
      },
      {
        relationId: 'modified',
        kind: 'modified',
        before: modified,
        after: updated,
      },
      {
        relationId: 'removed',
        kind: 'removed',
        before: removed,
      },
    ],
  });

  assert.deepEqual({ before, after }, original);
});

test('detects changes to relation kind, source, and target', () => {
  const relation = createRelation('relation');

  const updates: readonly Partial<CodeRelation>[] = [
    { kind: 'uses' },
    { sourceEntityId: 'draft' },
    { targetEntityId: 'draft' },
  ];

  for (const update of updates) {
    const updated: CodeRelation = { ...relation, ...update };

    const before = createSnapshot('before', [relation]);
    const after = createSnapshot('after', [updated]);

    assert.deepEqual(
      changesBetween(before, after),
      [
        {
          relationId: 'relation',
          kind: 'modified',
          before: relation,
          after: updated,
        },
      ],
      JSON.stringify(update),
    );
  }
});

test('ignores relation order', () => {
  const first = createRelation('first');
  const second = createRelation('second');

  const before = createSnapshot('before', [first, second]);
  const after = createSnapshot('after', [second, first]);

  assert.deepEqual(changesBetween(before, after), []);
});

test('rejects snapshots from different repositories', () => {
  const before = createSnapshot('before', []);
  const initial = createSnapshot('after', []);

  const after: SyncSnapshot = {
    ...initial,
    graph: {
      ...initial.graph,
      repositoryId: 'another-repository',
    },
  };

  assert.deepEqual(diffSnapshotRelations(before, after), {
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

  assert.deepEqual(diffSnapshotRelations(before, after), {
    status: 'incompatible',
    reason: 'analysis_profile_mismatch',
  });
});

test('treats a changed relation identifier as removal and addition', () => {
  const previous = createRelation('old');
  const current: CodeRelation = { ...previous, id: 'new' };

  const before = createSnapshot('before', [previous]);
  const after = createSnapshot('after', [current]);

  assert.deepEqual(changesBetween(before, after), [
    {
      relationId: 'new',
      kind: 'added',
      after: current,
    },
    {
      relationId: 'old',
      kind: 'removed',
      before: previous,
    },
  ]);
});

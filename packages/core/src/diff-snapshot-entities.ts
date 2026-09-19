import type { CodeEntity } from './code.js';
import type { SyncSnapshot } from './snapshot.js';

export interface CodeChange {
  readonly entityId: string;
  readonly kind: 'added' | 'modified' | 'removed';
}

export type SnapshotEntityDiff =
  | {
      readonly status: 'compared';
      readonly repositoryId: string;
      readonly beforeSnapshotId: string;
      readonly afterSnapshotId: string;
      readonly changes: readonly CodeChange[];
    }
  | {
      readonly status: 'incompatible';
      readonly reason: 'repository_mismatch' | 'analysis_profile_mismatch';
    };

/**
 * Both snapshots must contain validated code graphs.
 */
export function diffSnapshotEntities(
  before: SyncSnapshot,
  after: SyncSnapshot,
): SnapshotEntityDiff {
  if (before.graph.repositoryId !== after.graph.repositoryId) {
    return {
      status: 'incompatible',
      reason: 'repository_mismatch',
    };
  }

  if (before.analysisProfileId !== after.analysisProfileId) {
    return {
      status: 'incompatible',
      reason: 'analysis_profile_mismatch',
    };
  }

  const beforeEntities = new Map(
    before.graph.entities.map((entity) => [entity.id, entity] as const),
  );

  const afterEntities = new Map(
    after.graph.entities.map((entity) => [entity.id, entity] as const),
  );

  const entityIds = new Set([
    ...beforeEntities.keys(),
    ...afterEntities.keys(),
  ]);

  const changes: CodeChange[] = [];

  for (const entityId of [...entityIds].sort()) {
    const previous = beforeEntities.get(entityId);
    const current = afterEntities.get(entityId);

    if (previous === undefined) {
      changes.push({ entityId, kind: 'added' });
    } else if (current === undefined) {
      changes.push({ entityId, kind: 'removed' });
    } else if (hasEntityChanged(previous, current)) {
      changes.push({ entityId, kind: 'modified' });
    }
  }

  return {
    status: 'compared',
    repositoryId: before.graph.repositoryId,
    beforeSnapshotId: before.id,
    afterSnapshotId: after.id,
    changes,
  };
}

function hasEntityChanged(before: CodeEntity, after: CodeEntity): boolean {
  return (
    before.structuralHash !== after.structuralHash ||
    before.kind !== after.kind ||
    before.name !== after.name ||
    before.filePath !== after.filePath ||
    before.symbol !== after.symbol
  );
}

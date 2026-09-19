import type { CodeRelation } from './code.js';
import type { SyncSnapshot } from './snapshot.js';

export type CodeRelationChange =
  | {
      readonly relationId: string;
      readonly kind: 'added';
      readonly after: CodeRelation;
    }
  | {
      readonly relationId: string;
      readonly kind: 'removed';
      readonly before: CodeRelation;
    }
  | {
      readonly relationId: string;
      readonly kind: 'modified';
      readonly before: CodeRelation;
      readonly after: CodeRelation;
    };

export type SnapshotRelationDiff =
  | {
      readonly status: 'compared';
      readonly repositoryId: string;
      readonly beforeSnapshotId: string;
      readonly afterSnapshotId: string;
      readonly changes: readonly CodeRelationChange[];
    }
  | {
      readonly status: 'incompatible';
      readonly reason: 'repository_mismatch' | 'analysis_profile_mismatch';
    };

/**
 * Both snapshots must contain validated code graphs.
 */
export function diffSnapshotRelations(
  before: SyncSnapshot,
  after: SyncSnapshot,
): SnapshotRelationDiff {
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

  const beforeRelations = new Map(
    before.graph.relations.map((relation) => [relation.id, relation] as const),
  );

  const afterRelations = new Map(
    after.graph.relations.map((relation) => [relation.id, relation] as const),
  );

  const relationIds = new Set([
    ...beforeRelations.keys(),
    ...afterRelations.keys(),
  ]);

  const changes: CodeRelationChange[] = [];

  for (const relationId of [...relationIds].sort()) {
    const previous = beforeRelations.get(relationId);
    const current = afterRelations.get(relationId);

    if (previous === undefined && current !== undefined) {
      changes.push({
        relationId,
        kind: 'added',
        after: current,
      });
    } else if (previous !== undefined && current === undefined) {
      changes.push({
        relationId,
        kind: 'removed',
        before: previous,
      });
    } else if (
      previous !== undefined &&
      current !== undefined &&
      hasRelationChanged(previous, current)
    ) {
      changes.push({
        relationId,
        kind: 'modified',
        before: previous,
        after: current,
      });
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

function hasRelationChanged(
  before: CodeRelation,
  after: CodeRelation,
): boolean {
  return (
    before.kind !== after.kind ||
    before.sourceEntityId !== after.sourceEntityId ||
    before.targetEntityId !== after.targetEntityId
  );
}

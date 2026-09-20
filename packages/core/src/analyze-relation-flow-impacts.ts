import type {
  CodeRelationChange,
  SnapshotRelationDiff,
} from './diff-snapshot-relations.js';
import type {
  FlowImpact,
  FlowImpactAnalysis,
  FlowImpactReason,
} from './flow-impact.js';
import type { Flow } from './flow.js';

/**
 * Flows must be validated.
 * The diff must come from diffSnapshotRelations.
 */
export function analyzeRelationFlowImpacts(
  flows: readonly Flow[],
  diff: SnapshotRelationDiff,
): FlowImpactAnalysis {
  if (diff.status === 'incompatible') {
    return diff;
  }

  const changesByEntityId = new Map<string, CodeRelationChange[]>();

  for (const change of diff.changes) {
    const entityIds = new Set<string>();

    if (change.kind !== 'added') {
      entityIds.add(change.before.sourceEntityId);
      entityIds.add(change.before.targetEntityId);
    }

    if (change.kind !== 'removed') {
      entityIds.add(change.after.sourceEntityId);
      entityIds.add(change.after.targetEntityId);
    }

    for (const entityId of entityIds) {
      const changes = changesByEntityId.get(entityId);

      if (changes === undefined) {
        changesByEntityId.set(entityId, [change]);
      } else {
        changes.push(change);
      }
    }
  }

  const impacts: FlowImpact[] = [];

  for (const flow of flows) {
    const reasons: FlowImpactReason[] = [];

    for (const reference of flow.codeReferences) {
      if (reference.repositoryId !== diff.repositoryId) {
        continue;
      }

      const changes = changesByEntityId.get(reference.codeEntityId) ?? [];

      for (const change of changes) {
        reasons.push({
          type: 'relation',
          referenceId: reference.id,
          nodeId: reference.flowNodeId,
          entityId: reference.codeEntityId,
          change,
        });
      }
    }

    if (reasons.length > 0) {
      impacts.push({
        flowId: flow.id,
        reasons,
      });
    }
  }

  return {
    status: 'analyzed',
    repositoryId: diff.repositoryId,
    beforeSnapshotId: diff.beforeSnapshotId,
    afterSnapshotId: diff.afterSnapshotId,
    impacts,
  };
}

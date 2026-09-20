import type { SnapshotEntityDiff } from './diff-snapshot-entities.js';
import type {
  FlowImpact,
  FlowImpactAnalysis,
  FlowImpactReason,
} from './flow-impact.js';
import type { Flow } from './flow.js';

/**
 * Flows must be validated.
 * The diff must come from diffSnapshotEntities.
 */
export function analyzeEntityFlowImpacts(
  flows: readonly Flow[],
  diff: SnapshotEntityDiff,
): FlowImpactAnalysis {
  if (diff.status === 'incompatible') {
    return diff;
  }

  const changesByEntityId = new Map(
    diff.changes.map((change) => [change.entityId, change] as const),
  );

  const impacts: FlowImpact[] = [];

  for (const flow of flows) {
    const reasons: FlowImpactReason[] = [];

    for (const reference of flow.codeReferences) {
      if (reference.repositoryId !== diff.repositoryId) {
        continue;
      }

      const change = changesByEntityId.get(reference.codeEntityId);

      if (change === undefined) {
        continue;
      }

      reasons.push({
        type: 'entity',
        referenceId: reference.id,
        nodeId: reference.flowNodeId,
        change,
      });
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

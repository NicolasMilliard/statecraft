import type {
  CodeChange,
  SnapshotEntityDiff,
} from './diff-snapshot-entities.js';
import type { Flow } from './flow.js';

export interface FlowImpactReason {
  readonly type: 'entity';
  readonly referenceId: string;
  readonly nodeId: string;
  readonly change: CodeChange;
}

export interface FlowImpact {
  readonly flowId: string;
  readonly reasons: readonly FlowImpactReason[];
}

export type FlowImpactAnalysis =
  | {
      readonly status: 'analyzed';
      readonly repositoryId: string;
      readonly beforeSnapshotId: string;
      readonly afterSnapshotId: string;
      readonly impacts: readonly FlowImpact[];
    }
  | Extract<SnapshotEntityDiff, { status: 'incompatible' }>;

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

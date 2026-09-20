import { analyzeEntityFlowImpacts } from './analyze-entity-flow-impacts.js';
import { analyzeRelationFlowImpacts } from './analyze-relation-flow-impacts.js';
import { diffSnapshotEntities } from './diff-snapshot-entities.js';
import { diffSnapshotRelations } from './diff-snapshot-relations.js';
import type { FlowImpact, FlowImpactAnalysis } from './flow-impact.js';
import type { Flow } from './flow.js';
import type { SyncSnapshot } from './snapshot.js';

/**
 * Flows must be validated and have unique IDs.
 * Both snapshots must contain validated code graphs.
 */
export function analyzeSnapshotFlowImpacts(
  flows: readonly Flow[],
  before: SyncSnapshot,
  after: SyncSnapshot,
): FlowImpactAnalysis {
  const entityAnalysis = analyzeEntityFlowImpacts(
    flows,
    diffSnapshotEntities(before, after),
  );

  if (entityAnalysis.status === 'incompatible') {
    return entityAnalysis;
  }

  const relationAnalysis = analyzeRelationFlowImpacts(
    flows,
    diffSnapshotRelations(before, after),
  );

  if (relationAnalysis.status === 'incompatible') {
    return relationAnalysis;
  }

  const entityImpactsByFlowId = new Map(
    entityAnalysis.impacts.map((impact) => [impact.flowId, impact] as const),
  );

  const relationImpactsByFlowId = new Map(
    relationAnalysis.impacts.map((impact) => [impact.flowId, impact] as const),
  );

  const impacts: FlowImpact[] = [];

  for (const flow of flows) {
    const reasons = [
      ...(entityImpactsByFlowId.get(flow.id)?.reasons ?? []),
      ...(relationImpactsByFlowId.get(flow.id)?.reasons ?? []),
    ];

    if (reasons.length > 0) {
      impacts.push({
        flowId: flow.id,
        reasons,
      });
    }
  }

  return {
    ...entityAnalysis,
    impacts,
  };
}

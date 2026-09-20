import { analyzeSnapshotFlowImpacts } from './analyze-snapshot-flow-impacts.js';
import type { FlowImpactAnalysis, FlowImpactReason } from './flow-impact.js';
import type { Flow } from './flow.js';
import type { SyncSnapshot } from './snapshot.js';

export interface FlowReview {
  readonly flowId: string;
  readonly repositoryId: string;
  readonly snapshotId: string;
}

export type FlowReviewAssessment = {
  readonly flowId: string;
  readonly repositoryId: string;
  readonly currentSnapshotId: string;
} & (
  | {
      readonly status: 'unreviewed';
    }
  | {
      readonly status: 'unchanged';
      readonly reviewedSnapshotId: string;
    }
  | {
      readonly status: 'needs_review';
      readonly reviewedSnapshotId: string;
      readonly reasons: readonly FlowImpactReason[];
    }
  | {
      readonly status: 'unavailable';
      readonly reviewedSnapshotId: string;
      readonly reason:
        | 'review_flow_mismatch'
        | 'review_repository_mismatch'
        | 'reviewed_snapshot_unavailable'
        | 'reviewed_snapshot_mismatch'
        | Extract<FlowImpactAnalysis, { status: 'incompatible' }>['reason'];
    }
);

/**
 * The flow must be validated.
 * Any supplied snapshots must contain validated code graphs.
 * Evaluation never changes the recorded review.
 */
export function evaluateFlowReview(
  flow: Flow,
  review: FlowReview | null,
  reviewedSnapshot: SyncSnapshot | null,
  currentSnapshot: SyncSnapshot,
): FlowReviewAssessment {
  const context = {
    flowId: flow.id,
    repositoryId: currentSnapshot.graph.repositoryId,
    currentSnapshotId: currentSnapshot.id,
  };

  if (review === null) {
    return {
      ...context,
      status: 'unreviewed',
    };
  }

  const reviewContext = {
    ...context,
    reviewedSnapshotId: review.snapshotId,
  };

  if (review.flowId !== flow.id) {
    return {
      ...reviewContext,
      status: 'unavailable',
      reason: 'review_flow_mismatch',
    };
  }

  if (review.repositoryId !== currentSnapshot.graph.repositoryId) {
    return {
      ...reviewContext,
      status: 'unavailable',
      reason: 'review_repository_mismatch',
    };
  }

  if (reviewedSnapshot === null) {
    return {
      ...reviewContext,
      status: 'unavailable',
      reason: 'reviewed_snapshot_unavailable',
    };
  }

  if (reviewedSnapshot.id !== review.snapshotId) {
    return {
      ...reviewContext,
      status: 'unavailable',
      reason: 'reviewed_snapshot_mismatch',
    };
  }

  const analysis = analyzeSnapshotFlowImpacts(
    [flow],
    reviewedSnapshot,
    currentSnapshot,
  );

  if (analysis.status === 'incompatible') {
    return {
      ...reviewContext,
      status: 'unavailable',
      reason: analysis.reason,
    };
  }

  const [impact] = analysis.impacts;

  if (impact === undefined) {
    return {
      ...reviewContext,
      status: 'unchanged',
    };
  }

  return {
    ...reviewContext,
    status: 'needs_review',
    reasons: impact.reasons,
  };
}

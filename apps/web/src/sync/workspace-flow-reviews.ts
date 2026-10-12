import {
  evaluateFlowReview,
  type Flow,
  type FlowReview,
  type FlowReviewAssessment,
  type SnapshotDocument,
  type SyncSnapshot,
} from '@statecraft/core';

export type WorkspaceFlowReviewAssessment =
  | { readonly status: 'no_snapshot'; readonly flowId: string }
  | {
      readonly status: 'unmapped';
      readonly flowId: string;
      readonly repositoryId: string;
      readonly currentSnapshotId: string;
    }
  | FlowReviewAssessment;

export function assessWorkspaceFlowReview(
  flow: Flow,
  reviews: readonly FlowReview[],
  documents: readonly SnapshotDocument[],
  currentSnapshot: SyncSnapshot | null,
): WorkspaceFlowReviewAssessment {
  if (currentSnapshot === null) return { status: 'no_snapshot', flowId: flow.id };

  const repositoryId = currentSnapshot.graph.repositoryId;
  if (!flow.codeReferences.some((reference) => reference.repositoryId === repositoryId)) {
    return {
      status: 'unmapped',
      flowId: flow.id,
      repositoryId,
      currentSnapshotId: currentSnapshot.id,
    };
  }

  const review = reviews.find((item) => item.repositoryId === repositoryId) ?? null;
  const reviewedSnapshot = review === null ? null :
    documents.find((document) => document.snapshot.id === review.snapshotId)?.snapshot ?? null;

  return evaluateFlowReview(flow, review, reviewedSnapshot, currentSnapshot);
}

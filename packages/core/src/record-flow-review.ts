import type { FlowReview } from './flow-review.js';
import type { Flow } from './flow.js';
import type { SyncSnapshot } from './snapshot.js';

/**
 * Call after an explicit review of the supplied snapshot.
 * The flow and snapshot code graph must be validated.
 * Existing reviews must be unique by flowId and repositoryId.
 */
export function recordFlowReview(
  reviews: readonly FlowReview[],
  flow: Flow,
  reviewedSnapshot: SyncSnapshot,
): readonly FlowReview[] {
  const recorded: FlowReview = {
    flowId: flow.id,
    repositoryId: reviewedSnapshot.graph.repositoryId,
    snapshotId: reviewedSnapshot.id,
  };

  const existingIndex = reviews.findIndex(
    (review) =>
      review.flowId === recorded.flowId &&
      review.repositoryId === recorded.repositoryId,
  );

  if (existingIndex === -1) {
    return [...reviews, recorded];
  }

  return reviews.map((review, index) =>
    index === existingIndex ? recorded : review,
  );
}

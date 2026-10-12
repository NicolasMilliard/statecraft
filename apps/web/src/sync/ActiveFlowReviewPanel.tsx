import type { Flow, SnapshotDocument, SyncSnapshot } from '@statecraft/core';
import { Button } from '../ui/Button';
import { FlowImpactReasons } from './FlowImpactPreview';
import type { WorkspaceFlowReviewAssessment } from './workspace-flow-reviews';

interface ActiveFlowReviewPanelProps {
  readonly flow: Flow;
  readonly current: SyncSnapshot;
  readonly documents: readonly SnapshotDocument[];
  readonly assessment: WorkspaceFlowReviewAssessment;
  readonly hasUnsavedChanges: boolean;
  readonly saveFailed: boolean;
  readonly onMarkReviewed: (snapshot: SyncSnapshot) => boolean;
}

function unavailableExplanation(reason: string): string {
  switch (reason) {
    case 'reviewed_snapshot_unavailable': return 'The reviewed snapshot is missing from local history.';
    case 'analysis_profile_mismatch': return 'The reviewed snapshot uses another analysis profile.';
    case 'repository_mismatch': return 'The reviewed snapshot belongs to another repository.';
    default: return 'The recorded review cannot be compared with this snapshot.';
  }
}

export function ActiveFlowReviewPanel({
  flow,
  current,
  documents,
  assessment,
  hasUnsavedChanges,
  saveFailed,
  onMarkReviewed,
}: ActiveFlowReviewPanelProps) {
  const reviewedDocument = 'reviewedSnapshotId' in assessment
    ? documents.find((document) => document.snapshot.id === assessment.reviewedSnapshotId)
    : null;
  const alreadyReviewedCurrent = assessment.status === 'unchanged' &&
    assessment.reviewedSnapshotId === current.id;
  const canRecord = assessment.status !== 'no_snapshot' &&
    assessment.status !== 'unmapped' && !hasUnsavedChanges && !alreadyReviewedCurrent;

  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Active flow review">
      <h3 className="text-ui font-medium wrap-anywhere">Review · {flow.name}</h3>
      <p className="mt-2 text-xs text-muted wrap-anywhere">
        {current.graph.repositoryId} · Current snapshot: {current.id}
      </p>
      {assessment.status === 'unmapped' ? (
        <p className="mt-3 text-ui text-muted">This Flow has no code links in this repository.</p>
      ) : assessment.status === 'unreviewed' ? (
        <p className="mt-3 text-ui text-muted">
          Unreviewed · {'reason' in assessment
            ? 'The code mapping changed since the recorded review.'
            : 'No review checkpoint has been recorded.'}
        </p>
      ) : assessment.status === 'unchanged' ? (
        <p className="mt-3 text-ui text-muted">Up to date · no direct changes to linked code since the recorded review.</p>
      ) : assessment.status === 'needs_review' ? (
        <>
          <p className="mt-3 text-ui text-foreground">
            Needs review · {assessment.reasons.length} {assessment.reasons.length === 1 ? 'reason' : 'reasons'}
          </p>
          {reviewedDocument && (
            <FlowImpactReasons
              flow={flow}
              reasons={assessment.reasons}
              before={reviewedDocument.snapshot}
              after={current}
            />
          )}
        </>
      ) : assessment.status === 'unavailable' ? (
        <p className="mt-3 text-ui text-danger">
          Unavailable · {unavailableExplanation(assessment.reason)}
        </p>
      ) : null}
      {'reviewedSnapshotId' in assessment && (
        <p className="mt-3 font-mono text-xs text-muted wrap-anywhere">
          Reviewed snapshot: {assessment.reviewedSnapshotId}
        </p>
      )}
      {hasUnsavedChanges && assessment.status !== 'unmapped' && (
        <p className="mt-3 text-xs text-muted">Save this Flow before recording a review.</p>
      )}
      {saveFailed && <p role="alert" className="mt-3 text-ui text-danger">Could not save the review checkpoint. The previous review is unchanged.</p>}
      {assessment.status !== 'unmapped' && (
        <Button
          variant="secondary"
          className="mt-4"
          disabled={!canRecord}
          onClick={() => onMarkReviewed(current)}
        >
          Mark as reviewed
        </Button>
      )}
    </section>
  );
}

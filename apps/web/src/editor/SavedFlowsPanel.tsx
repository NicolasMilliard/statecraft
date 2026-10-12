import type { Flow, FlowReview, SnapshotDocument } from '@statecraft/core';
import { useMemo } from 'react';
import type { FlowEditorState } from './flow-editor-state';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { FlowImpactReasons } from '../sync/FlowImpactPreview';
import { assessProjectFlowReviews } from '../sync/project-flow-reviews';
import type { WorkspaceFlowReviewAssessment } from '../sync/workspace-flow-reviews';
import { Button } from '../ui/Button';

interface SavedFlowsPanelProps {
  readonly flows: readonly FlowEditorState[];
  readonly activeFlow: Flow;
  readonly activeReviews: readonly FlowReview[];
  readonly hasUnsavedChanges: boolean;
  readonly documents: readonly SnapshotDocument[];
  readonly current: SnapshotDocument | null;
  readonly issue: string | null;
  readonly onOpen: (flowId: string, nodeId?: string) => void;
  readonly onLocateActiveNode: (nodeId: string) => void;
}

const statusLabels: Record<WorkspaceFlowReviewAssessment['status'], string> = {
  no_snapshot: 'No snapshot',
  unmapped: 'Unmapped',
  unreviewed: 'Unreviewed',
  unchanged: 'Up to date',
  needs_review: 'Needs review',
  unavailable: 'Unavailable',
};

function statusDetail(assessment: WorkspaceFlowReviewAssessment): string {
  switch (assessment.status) {
    case 'no_snapshot': return 'Import a repository snapshot to assess this Flow.';
    case 'unmapped': return 'No code links in the selected repository.';
    case 'unreviewed': return 'reason' in assessment
      ? 'Code links changed since the recorded review.'
      : 'No review checkpoint for this repository.';
    case 'unchanged': return 'No direct changes to linked code since the recorded review.';
    case 'needs_review': return `${assessment.reasons.length} ${assessment.reasons.length === 1 ? 'reason' : 'reasons'} since the recorded review.`;
    case 'unavailable': return `Review comparison unavailable: ${assessment.reason.replaceAll('_', ' ')}.`;
  }
}

function ReviewStatus({
  flow,
  assessment,
  documents,
  current,
  onLocateNode,
}: {
  readonly flow: Flow;
  readonly assessment: WorkspaceFlowReviewAssessment;
  readonly documents: readonly SnapshotDocument[];
  readonly current: SnapshotDocument | null;
  readonly onLocateNode: (nodeId: string) => void;
}) {
  const reviewed = 'reviewedSnapshotId' in assessment
    ? documents.find((document) => document.snapshot.id === assessment.reviewedSnapshotId)
    : null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className={`text-ui font-medium ${assessment.status === 'needs_review' || assessment.status === 'unavailable' ? 'text-danger' : 'text-foreground'}`}>
        {statusLabels[assessment.status]}
      </p>
      <p className="mt-1 text-xs text-muted wrap-anywhere">{statusDetail(assessment)}</p>
      {'reviewedSnapshotId' in assessment && (
        <p className="mt-2 font-mono text-xs text-muted wrap-anywhere">Reviewed snapshot: {assessment.reviewedSnapshotId}</p>
      )}
      {assessment.status === 'needs_review' && reviewed && current && (
        <FlowImpactReasons
          flow={flow}
          reasons={assessment.reasons}
          before={reviewed.snapshot}
          after={current.snapshot}
          onLocateNode={onLocateNode}
        />
      )}
    </div>
  );
}

export function SavedFlowsPanel({
  flows,
  activeFlow,
  activeReviews,
  hasUnsavedChanges,
  documents,
  current,
  issue,
  onOpen,
  onLocateActiveNode,
}: SavedFlowsPanelProps) {
  const project = useMemo(
    () => assessProjectFlowReviews(
      flows,
      activeFlow,
      activeReviews,
      hasUnsavedChanges,
      documents,
      current?.snapshot ?? null,
    ),
    [flows, activeFlow, activeReviews, hasUnsavedChanges, documents, current],
  );

  return (
    <InspectorPanel title="Flows" context={`${flows.length} saved`}>
      {issue !== null && <p role="alert" className="mb-4 text-ui text-danger">Review list may be incomplete: {issue}</p>}
      {current === null ? (
        <p className="text-ui text-muted">No repository snapshot selected. Open a snapshot in Sync to assess saved Flows.</p>
      ) : (
        <div className="rounded-control border border-border bg-surface p-3">
          <p className="text-ui font-medium wrap-anywhere">{project.needsReviewCount} of {flows.length} saved {flows.length === 1 ? 'Flow needs' : 'Flows need'} review</p>
          <p className="mt-1 text-xs text-muted wrap-anywhere">Repository: {current.snapshot.graph.repositoryId}</p>
          <p className="mt-1 font-mono text-xs text-muted wrap-anywhere">Current snapshot: {current.snapshot.id}</p>
          <p className="mt-2 text-xs text-muted">Unreviewed, unavailable, and unmapped Flows appear separately below.</p>
        </div>
      )}
      {flows.length === 0 ? (
        <p className="mt-4 text-ui text-muted">Save a Flow to make it available here across reloads.</p>
      ) : (
        <ul className="mt-4 space-y-3" aria-label="Saved flow reviews">
          {project.saved.map(({ editor, assessment }) => {
            const isCurrent = editor.flow.id === activeFlow.id;
            return (
              <li key={editor.flow.id} className="rounded-control border border-border bg-surface p-3">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-ui font-medium wrap-anywhere">{editor.flow.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {editor.flow.nodes.length} nodes · {editor.flow.codeReferences.length} code links
                    </p>
                    {isCurrent && <p className="mt-1 text-xs text-brand">Current flow · saved copy</p>}
                  </div>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    disabled={isCurrent && !hasUnsavedChanges}
                    onClick={() => onOpen(editor.flow.id)}
                    aria-label={`${isCurrent ? 'Reopen saved' : 'Open'} ${editor.flow.name}`}
                  >
                    {isCurrent && hasUnsavedChanges ? 'Reopen' : 'Open'}
                  </Button>
                </div>
                <ReviewStatus
                  flow={editor.flow}
                  assessment={assessment}
                  documents={documents}
                  current={current}
                  onLocateNode={(nodeId) => onOpen(editor.flow.id, nodeId)}
                />
              </li>
            );
          })}
        </ul>
      )}
      {project.activePreview && (
        <section className="mt-5 rounded-control border border-brand-border bg-brand-soft p-3" aria-label="Unsaved flow review preview">
          <h3 className="text-ui font-medium wrap-anywhere">Unsaved preview · {activeFlow.name}</h3>
          <p className="mt-1 text-xs text-muted">Current editor state. Save before recording a review in Sync.</p>
          <ReviewStatus
            flow={activeFlow}
            assessment={project.activePreview}
            documents={documents}
            current={current}
            onLocateNode={onLocateActiveNode}
          />
        </section>
      )}
    </InspectorPanel>
  );
}

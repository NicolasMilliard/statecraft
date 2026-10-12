import type { Flow, FlowReview, SnapshotDocument, SyncSnapshot } from '@statecraft/core';
import type { FlowEditorState } from '../editor/flow-editor-state';
import { assessWorkspaceFlowReview, type WorkspaceFlowReviewAssessment } from './workspace-flow-reviews.ts';

export interface ProjectFlowReviewItem {
  readonly editor: FlowEditorState;
  readonly assessment: WorkspaceFlowReviewAssessment;
}

export interface ProjectFlowReviews {
  readonly saved: readonly ProjectFlowReviewItem[];
  readonly needsReviewCount: number;
  readonly activePreview: WorkspaceFlowReviewAssessment | null;
}

export function assessProjectFlowReviews(
  savedFlows: readonly FlowEditorState[],
  activeFlow: Flow,
  activeReviews: readonly FlowReview[],
  hasUnsavedChanges: boolean,
  documents: readonly SnapshotDocument[],
  currentSnapshot: SyncSnapshot | null,
): ProjectFlowReviews {
  const saved = savedFlows.map((editor) => ({
    editor,
    assessment: assessWorkspaceFlowReview(editor.flow, editor.reviews, documents, currentSnapshot),
  }));

  return {
    saved,
    needsReviewCount: saved.filter(({ assessment }) => assessment.status === 'needs_review').length,
    activePreview: hasUnsavedChanges
      ? assessWorkspaceFlowReview(activeFlow, activeReviews, documents, currentSnapshot)
      : null,
  };
}

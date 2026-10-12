import {
  analyzeSnapshotFlowImpacts,
  type Flow,
  type FlowImpactAnalysis,
  type FlowImpactReason,
  type SyncSnapshot,
} from '@statecraft/core';
import type { FlowEditorState } from '../editor/flow-editor-state';

export interface WorkspaceFlow {
  readonly flow: Flow;
  readonly isSaved: boolean;
  readonly isPreview: boolean;
}

export interface ImpactedWorkspaceFlow extends WorkspaceFlow {
  readonly reasons: readonly FlowImpactReason[];
}

export type WorkspaceFlowImpactAnalysis =
  | Extract<FlowImpactAnalysis, { status: 'incompatible' }>
  | {
      readonly status: 'analyzed';
      readonly repositoryId: string;
      readonly beforeSnapshotId: string;
      readonly afterSnapshotId: string;
      readonly mappedFlowCount: number;
      readonly impacts: readonly ImpactedWorkspaceFlow[];
    };

/** Use the active editor copy once, even when its saved copy is also in the catalog. */
export function collectWorkspaceFlows(
  savedFlows: readonly FlowEditorState[],
  activeFlow: Flow,
  hasUnsavedChanges: boolean,
): readonly WorkspaceFlow[] {
  const flows = savedFlows.map(({ flow }) => ({
    flow: flow.id === activeFlow.id ? activeFlow : flow,
    isSaved: true,
    isPreview: flow.id === activeFlow.id && hasUnsavedChanges,
  }));

  if (!flows.some(({ flow }) => flow.id === activeFlow.id)) {
    flows.push({ flow: activeFlow, isSaved: false, isPreview: true });
  }

  return flows;
}

export function analyzeWorkspaceFlowImpacts(
  workspaceFlows: readonly WorkspaceFlow[],
  before: SyncSnapshot,
  after: SyncSnapshot,
): WorkspaceFlowImpactAnalysis {
  const analysis = analyzeSnapshotFlowImpacts(
    workspaceFlows.map(({ flow }) => flow),
    before,
    after,
  );

  if (analysis.status === 'incompatible') return analysis;

  const flowsById = new Map(workspaceFlows.map((flow) => [flow.flow.id, flow] as const));

  return {
    status: 'analyzed',
    repositoryId: analysis.repositoryId,
    beforeSnapshotId: analysis.beforeSnapshotId,
    afterSnapshotId: analysis.afterSnapshotId,
    mappedFlowCount: workspaceFlows.filter(({ flow }) =>
      flow.codeReferences.some((reference) => reference.repositoryId === analysis.repositoryId),
    ).length,
    impacts: analysis.impacts.map((impact) => ({
      ...flowsById.get(impact.flowId)!,
      reasons: impact.reasons,
    })),
  };
}

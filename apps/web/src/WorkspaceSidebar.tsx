import type { FlowEdge, FlowNode } from "@statecraft/core";
import type { RefObject } from "react";

import { SavedFlowsPanel } from "./editor/SavedFlowsPanel";
import type { useFlowEditor } from "./editor/use-flow-editor";
import { EdgeInspector } from "./inspector/EdgeInspector";
import { NodeInspector } from "./inspector/NodeInspector";
import { SelectionInspector } from "./inspector/SelectionInspector";
import { ScenarioPanel } from "./scenarios/ScenarioPanel";
import type { useScenarioWorkspace } from "./scenarios/use-scenario-workspace";
import { SnapshotPanel } from "./sync/SnapshotPanel";
import type { useSnapshotHistory } from "./sync/use-snapshot-history";

export type WorkspacePanelMode = "inspector" | "flows" | "scenarios" | "sync";

interface WorkspaceSidebarProps {
  readonly editor: ReturnType<typeof useFlowEditor>;
  readonly snapshots: ReturnType<typeof useSnapshotHistory>;
  readonly scenarios: ReturnType<typeof useScenarioWorkspace>;
  readonly selectedNodes: readonly FlowNode[];
  readonly selectedEdges: readonly FlowEdge[];
  readonly panelMode: WorkspacePanelMode;
  readonly onPanelModeChange: (mode: WorkspacePanelMode) => void;
  readonly onFlowOpen: (flowId: string, nodeId?: string) => void;
  readonly onLocateActiveNode: (nodeId: string) => void;
  readonly nodeLabelInputRef: RefObject<HTMLInputElement | null>;
  readonly onSelectionDelete: () => void;
  readonly onNodeDelete: (id: string) => void;
  readonly onEdgeDelete: (id: string) => void;
}

export function WorkspaceSidebar({
  editor,
  snapshots,
  scenarios,
  selectedNodes,
  selectedEdges,
  panelMode,
  onPanelModeChange,
  onFlowOpen,
  onLocateActiveNode,
  nodeLabelInputRef,
  onSelectionDelete,
  onNodeDelete,
  onEdgeDelete,
}: WorkspaceSidebarProps) {
  const { flow } = editor;
  const selectedCount = selectedNodes.length + selectedEdges.length;
  const selectedNode = selectedCount === 1 ? (selectedNodes[0] ?? null) : null;
  const selectedEdge = selectedCount === 1 ? (selectedEdges[0] ?? null) : null;

  function renderPanel() {
    if (panelMode === "flows") {
      return (
        <SavedFlowsPanel
          flows={editor.savedFlows}
          activeFlow={flow}
          activeReviews={editor.reviews}
          hasUnsavedChanges={editor.hasUnsavedChanges}
          documents={snapshots.documents}
          current={snapshots.current}
          issue={editor.catalogIssue}
          onOpen={onFlowOpen}
          onLocateActiveNode={onLocateActiveNode}
        />
      );
    }
    if (panelMode === "sync") {
      return (
        <SnapshotPanel
          documents={snapshots.documents}
          current={snapshots.current}
          baseline={snapshots.baseline}
          compatible={snapshots.compatible}
          savedFlows={editor.savedFlows}
          activeFlow={flow}
          activeReviews={editor.reviews}
          hasUnsavedFlowChanges={editor.hasUnsavedChanges}
          reviewSaveFailed={editor.reviewSaveFailed}
          flowCatalogIssue={editor.catalogIssue}
          storageIssue={snapshots.storageIssue}
          onCurrentChange={snapshots.selectCurrent}
          onBaselineChange={snapshots.selectBaseline}
          onMarkReviewed={editor.markReviewed}
        />
      );
    }
    if (panelMode === "scenarios") {
      return (
        <ScenarioPanel
          flow={flow}
          scenarios={editor.scenarios}
          selectedScenario={scenarios.selected}
          playback={scenarios.playback}
          onRun={scenarios.run}
          onPause={scenarios.pause}
          onResume={scenarios.resume}
          onNextStep={scenarios.nextStep}
          onRestart={scenarios.restart}
          focusNameScenarioId={scenarios.focusNameId}
          onNameFocusHandled={scenarios.nameFocusHandled}
          onSelect={scenarios.select}
          onCreate={scenarios.create}
          onDuplicate={scenarios.duplicate}
          onRename={editor.changeScenarioName}
          onDelete={scenarios.remove}
          onOverrideChange={editor.changeScenarioOverride}
        />
      );
    }
    if (selectedCount > 1) {
      return (
        <SelectionInspector
          nodeCount={selectedNodes.length}
          edgeCount={selectedEdges.length}
          onSelectionDelete={onSelectionDelete}
        />
      );
    }
    if (selectedEdge !== null) {
      return (
        <EdgeInspector
          flow={flow}
          edge={selectedEdge}
          onEdgeKindChange={editor.setEdgeKind}
          onEdgeDelete={onEdgeDelete}
        />
      );
    }
    return (
      <NodeInspector
        labelInputRef={nodeLabelInputRef}
        node={selectedNode}
        flow={flow}
        snapshot={snapshots.current?.snapshot ?? null}
        isFlowEmpty={flow.nodes.length === 0}
        isEntry={selectedNode?.id === flow.entryNodeId}
        onNodeRename={editor.renameNode}
        onEntryNodeChange={editor.setEntryNode}
        onNodeDelete={onNodeDelete}
        onCodeAttach={(nodeId, entityId, role) => {
          if (snapshots.current !== null) {
            editor.attachEntity(
              snapshots.current.snapshot.graph,
              nodeId,
              entityId,
              role
            );
          }
        }}
        onCodeRoleChange={editor.changeReferenceRole}
        onCodeDetach={editor.detachReference}
      />
    );
  }
  return (
    <aside className="grid h-80 min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] border-t border-border bg-chrome md:h-auto md:border-t-0 md:border-l">
      <div
        role="group"
        aria-label="Workspace panel"
        className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2"
      >
        {(["inspector", "flows", "scenarios", "sync"] as const).map((mode) => {
          function getPanelLabel() {
            if (mode === "inspector") {
              return "Inspector" as const;
            }
            if (mode === "flows") {
              return `Flows (${editor.savedFlows.length})`;
            }
            if (mode === "scenarios") {
              return `Scenarios (${editor.scenarios.length})`;
            }
            return "Sync" as const;
          }
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={panelMode === mode}
              onClick={() => {
                onPanelModeChange(mode);
              }}
              className={`shrink-0 rounded-control px-3 py-1.5 text-ui font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${panelMode === mode ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-hover"}`}
            >
              {getPanelLabel()}
            </button>
          );
        })}
      </div>
      <div className="min-h-0">{renderPanel()}</div>
    </aside>
  );
}

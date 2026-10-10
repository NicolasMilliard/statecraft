import type { FlowEdge, FlowNode } from '@statecraft/core';
import type { RefObject } from 'react';
import type { useFlowEditor } from './editor/use-flow-editor';
import { EdgeInspector } from './inspector/EdgeInspector';
import { NodeInspector } from './inspector/NodeInspector';
import { SelectionInspector } from './inspector/SelectionInspector';
import { ScenarioPanel } from './scenarios/ScenarioPanel';
import type { useScenarioWorkspace } from './scenarios/use-scenario-workspace';
import { SnapshotPanel } from './sync/SnapshotPanel';
import type { useSnapshotHistory } from './sync/use-snapshot-history';

export type WorkspacePanelMode = 'inspector' | 'scenarios' | 'sync';

interface WorkspaceSidebarProps {
  readonly editor: ReturnType<typeof useFlowEditor>;
  readonly snapshots: ReturnType<typeof useSnapshotHistory>;
  readonly scenarios: ReturnType<typeof useScenarioWorkspace>;
  readonly selectedNodes: readonly FlowNode[];
  readonly selectedEdges: readonly FlowEdge[];
  readonly panelMode: WorkspacePanelMode;
  readonly onPanelModeChange: (mode: WorkspacePanelMode) => void;
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
  nodeLabelInputRef,
  onSelectionDelete,
  onNodeDelete,
  onEdgeDelete,
}: WorkspaceSidebarProps) {
  const { flow } = editor;
  const selectedCount = selectedNodes.length + selectedEdges.length;
  const selectedNode = selectedCount === 1 ? selectedNodes[0] ?? null : null;
  const selectedEdge = selectedCount === 1 ? selectedEdges[0] ?? null : null;

  return (
    <aside className="grid h-80 min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] border-t border-border bg-chrome md:h-auto md:border-t-0 md:border-l">
      <div role="group" aria-label="Workspace panel" className="flex gap-1 border-b border-border px-3 py-2">
        {(['inspector', 'scenarios', 'sync'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={panelMode === mode}
            onClick={() => onPanelModeChange(mode)}
            className={`rounded-control px-3 py-1.5 text-ui font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${panelMode === mode ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-hover'}`}
          >
            {mode === 'inspector' ? 'Inspector' : mode === 'scenarios' ? `Scenarios (${editor.scenarios.length})` : 'Sync'}
          </button>
        ))}
      </div>
      <div className="min-h-0">
        {panelMode === 'sync' ? (
          <SnapshotPanel
            documents={snapshots.documents}
            current={snapshots.current}
            baseline={snapshots.baseline}
            compatible={snapshots.compatible}
            storageIssue={snapshots.storageIssue}
            onCurrentChange={snapshots.selectCurrent}
            onBaselineChange={snapshots.selectBaseline}
          />
        ) : panelMode === 'scenarios' ? (
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
        ) : selectedCount > 1 ? (
          <SelectionInspector
            nodeCount={selectedNodes.length}
            edgeCount={selectedEdges.length}
            onSelectionDelete={onSelectionDelete}
          />
        ) : selectedEdge !== null ? (
          <EdgeInspector
            flow={flow}
            edge={selectedEdge}
            onEdgeKindChange={editor.setEdgeKind}
            onEdgeDelete={onEdgeDelete}
          />
        ) : (
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
                editor.attachEntity(snapshots.current.snapshot.graph, nodeId, entityId, role);
              }
            }}
            onCodeRoleChange={editor.changeReferenceRole}
            onCodeDetach={editor.detachReference}
          />
        )}
      </div>
    </aside>
  );
}

import type { FlowNodeKind } from '@statecraft/core';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CanvasSelection } from './canvas/canvas-selection';
import type { FlowNodePosition } from './canvas/flow-layout';
import { FlowCanvas, type FlowCanvasHandle } from './canvas/FlowCanvas';
import { CommandPalette } from './editor/CommandPalette';
import { createCommands, getShortcutPlatform } from './editor/commands';
import { EditorStatusBar } from './editor/EditorStatusBar';
import type { FlowFileActionsHandle } from './editor/FlowFileActions';
import { OpenFileConfirmation } from './editor/OpenFileConfirmation';
import { notifySaveResult } from './editor/save-feedback';
import { useDocumentOpening } from './editor/use-document-opening';
import { useEditorShortcuts } from './editor/use-editor-shortcuts';
import { useFileDrop } from './editor/use-file-drop';
import { useFlowEditor } from './editor/use-flow-editor';
import { WorkspaceHeader } from './editor/WorkspaceHeader';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { useScenarioWorkspace } from './scenarios/use-scenario-workspace';
import { useSnapshotHistory } from './sync/use-snapshot-history';
import { WorkspaceSidebar, type WorkspacePanelMode } from './WorkspaceSidebar';

export default function App() {
  const editor = useFlowEditor(checkoutFlow, checkoutLayout);
  const snapshots = useSnapshotHistory();
  const { flow, layout } = editor;

  const [selection, setSelection] = useState<CanvasSelection>({
    nodeIds: [],
    edgeIds: [],
  });
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<WorkspacePanelMode>('inspector');
  const [renamingFlowId, setRenamingFlowId] = useState<string | null>(null);
  const [platform] = useState(() => getShortcutPlatform(navigator.platform));
  const workspaceRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<FlowCanvasHandle>(null);
  const filesRef = useRef<FlowFileActionsHandle>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nodeLabelInputRef = useRef<HTMLInputElement>(null);
  const commandsButtonRef = useRef<HTMLButtonElement>(null);
  const paletteReturnFocus = useRef<HTMLElement | SVGElement | null>(null);
  const focusCanvasAfterUpdate = useRef(false);
  const pendingLabelFocusId = useRef<string | null>(null);

  if (renamingFlowId !== null && renamingFlowId !== flow.id) {
    setRenamingFlowId(null);
  }

  const selectedNodes = flow.nodes.filter((node) =>
    selection.nodeIds.includes(node.id),
  );

  const selectedEdges = flow.edges.filter((edge) =>
    selection.edgeIds.includes(edge.id),
  );

  const selectedCount = selectedNodes.length + selectedEdges.length;

  const selectedNode = selectedCount === 1 ? (selectedNodes[0] ?? null) : null;

  const scenarios = useScenarioWorkspace(flow, editor);
  const opening = useDocumentOpening({
    onFlowOpen: (restored) => {
      editor.restoreEditor(restored);
      setSelection({ nodeIds: [], edgeIds: [] });
      scenarios.reset();
      setCanvasRevision((current) => current + 1);
      focusCanvasAfterUpdate.current = true;
    },
    importSnapshot: snapshots.importDocument,
    onSnapshotSaved: () => setPanelMode('sync'),
  });
  const isOpeningBlocked = isRestoring || opening.isSavingSnapshot || opening.pendingOpen !== null;
  const fileDrop = useFileDrop(isOpeningBlocked, (file) => {
    void filesRef.current?.openFile(file, 'drop');
  });

  useLayoutEffect(() => {
    if (focusCanvasAfterUpdate.current) {
      focusCanvasAfterUpdate.current = false;
      pendingLabelFocusId.current = null;
      canvasRef.current?.focus();
    } else if (
      selectedNode?.id === pendingLabelFocusId.current &&
      nodeLabelInputRef.current
    ) {
      nodeLabelInputRef.current.focus();
      nodeLabelInputRef.current.select();
      pendingLabelFocusId.current = null;
    }
  });

  function handleNodeAdd(
    kind: FlowNodeKind,
    position: FlowNodePosition,
    focusTarget: 'canvas' | 'label',
  ) {
    const nodeId = editor.addNode(kind, position);
    pendingLabelFocusId.current = focusTarget === 'label' ? nodeId : null;
    if (focusTarget === 'label') setPanelMode('inspector');
    return nodeId;
  }

  function handleNodeDelete(nodeId: string) {
    focusCanvasAfterUpdate.current = true;
    editor.deleteNode(nodeId);
    setSelection({ nodeIds: [], edgeIds: [] });
  }

  function handleEdgeDelete(edgeId: string) {
    focusCanvasAfterUpdate.current = true;
    editor.deleteEdge(edgeId);
    setSelection({ nodeIds: [], edgeIds: [] });
  }

  function handleSelectionDelete() {
    focusCanvasAfterUpdate.current = true;
    editor.deleteElements(
      selectedNodes.map((node) => node.id),
      selectedEdges.map((edge) => edge.id),
    );

    setSelection({ nodeIds: [], edgeIds: [] });
  }

  function handleNewFlow() {
    focusCanvasAfterUpdate.current = true;
    editor.createFlow();
    setSelection({ nodeIds: [], edgeIds: [] });
    scenarios.reset();
  }

  // The factory stores these handlers; it never calls them during render.
  // eslint-disable-next-line react/refs
  const commands = createCommands(
    {
      commands: () => {
        const active = document.activeElement;
        paletteReturnFocus.current =
          active instanceof HTMLElement || active instanceof SVGElement
            ? active
            : null;
        setPaletteOpen(true);
      },
      'new-flow': handleNewFlow,
      'rename-flow': () => {
        setRenamingFlowId(flow.id);
        nameInputRef.current?.focus();
      },
      save: () =>
        notifySaveResult(editor.save(), () => filesRef.current?.export()),
      'open-json': () => filesRef.current?.open(),
      'export-json': () => filesRef.current?.export(),
      undo: () => {
        focusCanvasAfterUpdate.current = panelMode === 'inspector';
        editor.undo();
      },
      redo: () => {
        focusCanvasAfterUpdate.current = panelMode === 'inspector';
        editor.redo();
      },
      'reset-layout': editor.resetLayout,
      'fit-view': () => canvasRef.current?.fitView(),
      'select-all': () => canvasRef.current?.selectAll(),
      'delete-selection': handleSelectionDelete,
      cancel: () => canvasRef.current?.cancel(),
      'add-screen': () => canvasRef.current?.addNode('screen'),
      'add-ui': () => canvasRef.current?.addNode('ui'),
      'add-action': () => canvasRef.current?.addNode('action'),
      'add-service': () => canvasRef.current?.addNode('service'),
      'add-state': () => canvasRef.current?.addNode('state'),
    },
    {
      'new-flow': !isOpeningBlocked,
      'rename-flow': !isOpeningBlocked,
      save:
        !isOpeningBlocked &&
        (editor.hasUnsavedChanges || editor.storageIssue !== null),
      'open-json': !isOpeningBlocked,
      'export-json': !isOpeningBlocked,
      undo: editor.canUndo && !isOpeningBlocked,
      redo: editor.canRedo && !isOpeningBlocked,
      'reset-layout': !isOpeningBlocked && flow.nodes.length > 0,
      'fit-view': flow.nodes.length > 0,
      'select-all': selectedCount < flow.nodes.length + flow.edges.length,
      'delete-selection': selectedCount > 0 && !isOpeningBlocked,
      'add-screen': !isOpeningBlocked,
      'add-ui': !isOpeningBlocked,
      'add-action': !isOpeningBlocked,
      'add-service': !isOpeningBlocked,
      'add-state': !isOpeningBlocked,
    },
  );

  if (editor.willReplaceInvalidDraft)
    commands.save = { ...commands.save, label: 'Replace local copy' };
  else if (editor.storageIssue === 'save-failed')
    commands.save = { ...commands.save, label: 'Retry save' };

  useEditorShortcuts({ workspaceRef, commands, platform, paletteOpen });

  return (
    <main
      ref={workspaceRef}
      className="relative grid min-h-dvh w-full grid-rows-[auto_minmax(0,1fr)] md:h-dvh md:min-h-min md:grid-rows-[auto_minmax(32rem,1fr)]"
      {...fileDrop.dragHandlers}
    >
      <WorkspaceHeader
        editor={editor}
        commands={commands}
        platform={platform}
        isRestoring={isRestoring}
        paletteOpen={paletteOpen}
        renamingFlowId={renamingFlowId}
        nameInputRef={nameInputRef}
        filesRef={filesRef}
        commandsButtonRef={commandsButtonRef}
        onRenameClose={() => setRenamingFlowId(null)}
        onDocumentReady={opening.onDocumentReady}
        onRestoringChange={setIsRestoring}
      />

      <div className="grid min-h-0 min-w-0 grid-rows-[minmax(32rem,1fr)_auto] md:grid-cols-[minmax(0,1fr)_17.5rem] md:grid-rows-[minmax(0,1fr)]">
        <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto]">
          <FlowCanvas
            key={`${flow.id}:${canvasRevision}`}
            ref={canvasRef}
            commands={commands}
            platform={platform}
            flow={flow}
            layout={layout}
            playback={scenarios.canvasPlayback}
            onLayoutChange={editor.updateLayout}
            onSelectionChange={setSelection}
            onNodeAdd={handleNodeAdd}
            onNodesConnect={editor.connectNodes}
          />

          <EditorStatusBar
            nodeCount={flow.nodes.length}
            edgeCount={flow.edges.length}
            snapshot={snapshots.current?.snapshot ?? null}
            commands={commands}
            platform={platform}
          />
        </div>
        <WorkspaceSidebar
          editor={editor}
          snapshots={snapshots}
          scenarios={scenarios}
          selectedNodes={selectedNodes}
          selectedEdges={selectedEdges}
          panelMode={panelMode}
          onPanelModeChange={setPanelMode}
          nodeLabelInputRef={nodeLabelInputRef}
          onSelectionDelete={handleSelectionDelete}
          onNodeDelete={handleNodeDelete}
          onEdgeDelete={handleEdgeDelete}
        />
      </div>
      {paletteOpen && (
        <CommandPalette
          commands={Object.values(commands)}
          platform={platform}
          onClose={() => setPaletteOpen(false)}
          onRestoreFocus={() => {
            const previous = paletteReturnFocus.current;
            if (
              previous?.isConnected &&
              previous !== document.body &&
              !previous.matches(':disabled')
            ) {
              previous.focus({ preventScroll: true });
            } else {
              commandsButtonRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      )}
      {opening.pendingOpen !== null && (
        <OpenFileConfirmation
          fileName={opening.pendingOpen.fileName}
          document={opening.pendingOpen.document}
          currentFlowName={flow.name}
          hasUnsavedChanges={editor.hasUnsavedChanges}
          currentSnapshot={snapshots.current}
          onConfirm={opening.confirmPendingOpen}
          onCancel={opening.cancelPendingOpen}
        />
      )}
      {fileDrop.active && (
        <div role="status" className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-brand-border bg-brand-soft/85">
          <p className="rounded-control border border-brand-border bg-surface px-5 py-3 text-sm font-medium text-brand shadow-node">
            Drop one JSON file to open it
          </p>
        </div>
      )}
    </main>
  );
}

import type { FlowNodeKind, ScanReport } from '@statecraft/core';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CanvasSelection } from './canvas/canvas-selection';
import type { FlowNodePosition } from './canvas/flow-layout';
import { FlowCanvas, type FlowCanvasHandle } from './canvas/FlowCanvas';
import { CommandPalette } from './editor/CommandPalette';
import { createCommands, getShortcutPlatform } from './editor/commands';
import { EditorHeader } from './editor/EditorHeader';
import { EditorStatusBar } from './editor/EditorStatusBar';
import {
  FlowFileActions,
  type FileOpenSource,
  type FlowFileActionsHandle,
} from './editor/FlowFileActions';
import { FlowNameEditor } from './editor/FlowNameEditor';
import { OpenFileConfirmation } from './editor/OpenFileConfirmation';
import type { OpenDocument } from './editor/open-document';
import { notifySaveResult } from './editor/save-feedback';
import { toastMessage } from './editor/toast-message';
import { useEditorShortcuts } from './editor/use-editor-shortcuts';
import { useFlowEditor } from './editor/use-flow-editor';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { EdgeInspector } from './inspector/EdgeInspector';
import { NodeInspector } from './inspector/NodeInspector';
import { SelectionInspector } from './inspector/SelectionInspector';
import { ScenarioPanel } from './scenarios/ScenarioPanel';
import { useScenarioPlayback } from './scenarios/use-scenario-playback';

interface PendingOpen {
  readonly fileName: string;
  readonly document: OpenDocument;
}

export default function App() {
  const editor = useFlowEditor(checkoutFlow, checkoutLayout);
  const { flow, layout } = editor;

  const [selection, setSelection] = useState<CanvasSelection>({
    nodeIds: [],
    edgeIds: [],
  });
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'inspector' | 'scenarios'>('inspector');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [pendingScenarioNameFocusId, setPendingScenarioNameFocusId] = useState<string | null>(null);
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
  const fileDragDepth = useRef(0);

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

  const selectedEdge = selectedCount === 1 ? (selectedEdges[0] ?? null) : null;
  const selectedScenario = editor.scenarios.find(
    (scenario) => scenario.id === selectedScenarioId,
  ) ?? editor.scenarios[0] ?? null;
  const run = useScenarioPlayback(flow, selectedScenario);
  const runTrace = run.playback?.result.trace ?? null;
  const runStep = run.playback?.stepIndex ?? -1;
  const canvasPlayback = useMemo(() => runTrace === null ? null : {
    currentNodeId: runTrace.nodeIds[runStep] ?? null,
    visitedNodeIds: runTrace.nodeIds.slice(0, runStep + 1),
    currentEdgeId: runStep > 0 ? runTrace.edgeIds[runStep - 1] ?? null : null,
    visitedEdgeIds: runTrace.edgeIds.slice(0, runStep),
  }, [runTrace, runStep]);

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
    setSelectedScenarioId(null);
    setPendingScenarioNameFocusId(null);
  }

  function applyOpenDocument(fileName: string, document: OpenDocument) {
    if (document.kind === 'flow') {
      editor.restoreEditor(document.editor);
      setSelection({ nodeIds: [], edgeIds: [] });
      setSelectedScenarioId(null);
      setPendingScenarioNameFocusId(null);
      setCanvasRevision((current) => current + 1);
      focusCanvasAfterUpdate.current = true;
    } else {
      setScanReport(document.report);
    }

    toast.success(toastMessage('flow-file-success', document.kind === 'flow' ? 'Flow opened' : 'Scan report opened'), {
      id: 'flow-file-success',
      description: fileName,
    });
  }

  function handleDocumentReady(fileName: string, document: OpenDocument, source: FileOpenSource) {
    if (source === 'picker') {
      applyOpenDocument(fileName, document);
    } else {
      setPendingOpen({ fileName, document });
    }
  }

  const isOpeningBlocked = isRestoring || pendingOpen !== null;

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
      onDragEnter={(event) => {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        if (isOpeningBlocked) return;
        fileDragDepth.current += 1;
        setFileDragActive(true);
      }}
      onDragOver={(event) => {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        if (fileDragDepth.current === 0) return;
        fileDragDepth.current = Math.max(0, fileDragDepth.current - 1);
        if (fileDragDepth.current === 0) setFileDragActive(false);
      }}
      onDrop={(event) => {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        fileDragDepth.current = 0;
        setFileDragActive(false);
        if (isOpeningBlocked) return;
        const files = Array.from(event.dataTransfer.files);
        const file = files[0];
        if (files.length !== 1 || file === undefined) {
          toast.error('Drop one JSON file at a time.');
          return;
        }
        void filesRef.current?.openFile(file, 'drop');
      }}
    >
      <EditorHeader
        commands={commands}
        platform={platform}
        hasUnsavedChanges={editor.hasUnsavedChanges}
        willReplaceInvalidDraft={editor.willReplaceInvalidDraft}
        storageIssue={editor.storageIssue}
        isRestoring={isRestoring}
        paletteOpen={paletteOpen}
        commandsButtonRef={commandsButtonRef}
        nameEditor={
          <FlowNameEditor
            key={flow.id}
            ref={nameInputRef}
            command={commands['rename-flow']}
            platform={platform}
            name={flow.name}
            isEditing={renamingFlowId === flow.id}
            onRename={editor.renameFlow}
            onClose={() => setRenamingFlowId(null)}
          />
        }
        fileActions={
          <FlowFileActions
            key={flow.id}
            ref={filesRef}
            openCommand={commands['open-json']}
            exportCommand={commands['export-json']}
            platform={platform}
            flowName={flow.name}
            onExport={editor.exportDocument}
            onDocumentReady={handleDocumentReady}
            isRestoring={isRestoring}
            onRestoringChange={setIsRestoring}
          />
        }
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
            playback={canvasPlayback}
            onLayoutChange={editor.updateLayout}
            onSelectionChange={setSelection}
            onNodeAdd={handleNodeAdd}
            onNodesConnect={editor.connectNodes}
          />

          <EditorStatusBar
            nodeCount={flow.nodes.length}
            edgeCount={flow.edges.length}
            scanReport={scanReport}
            commands={commands}
            platform={platform}
          />
        </div>
        <aside className="grid h-80 min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] border-t border-border bg-chrome md:h-auto md:border-t-0 md:border-l">
          <div role="group" aria-label="Workspace panel" className="flex gap-1 border-b border-border px-3 py-2">
            {(['inspector', 'scenarios'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={panelMode === mode}
                onClick={() => setPanelMode(mode)}
                className={`rounded-control px-3 py-1.5 text-ui font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${panelMode === mode ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-hover'}`}
              >
                {mode === 'inspector' ? 'Inspector' : `Scenarios (${editor.scenarios.length})`}
              </button>
            ))}
          </div>
          <div className="min-h-0">
            {panelMode === 'scenarios' ? (
              <ScenarioPanel
                flow={flow}
                scenarios={editor.scenarios}
                selectedScenario={selectedScenario}
                playback={run.playback}
                onRun={run.start}
                onPause={run.pause}
                onResume={run.resume}
                onNextStep={run.nextStep}
                onRestart={run.restart}
                focusNameScenarioId={pendingScenarioNameFocusId}
                onNameFocusHandled={() => setPendingScenarioNameFocusId(null)}
                onSelect={(scenarioId) => {
                  setSelectedScenarioId(scenarioId);
                  setPendingScenarioNameFocusId(null);
                }}
                onCreate={() => {
                  const scenarioId = editor.createScenario();
                  setSelectedScenarioId(scenarioId);
                  setPendingScenarioNameFocusId(scenarioId);
                }}
                onDuplicate={(scenarioId) => {
                  const duplicateId = editor.copyScenario(scenarioId);
                  if (duplicateId !== null) {
                    setSelectedScenarioId(duplicateId);
                    setPendingScenarioNameFocusId(duplicateId);
                  }
                }}
                onRename={editor.changeScenarioName}
                onDelete={(scenarioId) => {
                  editor.deleteScenario(scenarioId);
                  setSelectedScenarioId(null);
                  setPendingScenarioNameFocusId(null);
                }}
                onOverrideChange={editor.changeScenarioOverride}
              />
            ) : selectedCount > 1 ? (
              <SelectionInspector
                nodeCount={selectedNodes.length}
                edgeCount={selectedEdges.length}
                onSelectionDelete={handleSelectionDelete}
              />
            ) : selectedEdge !== null ? (
              <EdgeInspector
                flow={flow}
                edge={selectedEdge}
                onEdgeKindChange={editor.setEdgeKind}
                onEdgeDelete={handleEdgeDelete}
              />
            ) : (
              <NodeInspector
                labelInputRef={nodeLabelInputRef}
                node={selectedNode}
                flow={flow}
                scanReport={scanReport}
                isFlowEmpty={flow.nodes.length === 0}
                isEntry={selectedNode?.id === flow.entryNodeId}
                onNodeRename={editor.renameNode}
                onEntryNodeChange={editor.setEntryNode}
                onNodeDelete={handleNodeDelete}
                onCodeAttach={(nodeId, entityId, role) => {
                  if (scanReport !== null) {
                    editor.attachEntity(scanReport.graph, nodeId, entityId, role);
                  }
                }}
                onCodeRoleChange={editor.changeReferenceRole}
                onCodeDetach={editor.detachReference}
              />
            )}
          </div>
        </aside>
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
      {pendingOpen !== null && (
        <OpenFileConfirmation
          fileName={pendingOpen.fileName}
          document={pendingOpen.document}
          currentFlowName={flow.name}
          hasUnsavedChanges={editor.hasUnsavedChanges}
          currentReport={scanReport}
          onConfirm={() => {
            setPendingOpen(null);
            applyOpenDocument(pendingOpen.fileName, pendingOpen.document);
          }}
          onCancel={() => setPendingOpen(null)}
        />
      )}
      {fileDragActive && (
        <div role="status" className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-brand-border bg-brand-soft/85">
          <p className="rounded-control border border-brand-border bg-surface px-5 py-3 text-sm font-medium text-brand shadow-node">
            Drop one JSON file to open it
          </p>
        </div>
      )}
    </main>
  );
}

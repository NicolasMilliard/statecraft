import type { FlowNodeKind } from '@statecraft/core';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CanvasSelection } from './canvas/canvas-selection';
import type { FlowNodePosition } from './canvas/flow-layout';
import { FlowCanvas, type FlowCanvasHandle } from './canvas/FlowCanvas';
import { FlowFileActions, type FlowFileActionsHandle } from './editor/FlowFileActions';
import { FlowNameEditor } from './editor/FlowNameEditor';
import { EditorHeader } from './editor/EditorHeader';
import { EditorStatusBar } from './editor/EditorStatusBar';
import { CommandPalette } from './editor/CommandPalette';
import { createCommands, getShortcutPlatform } from './editor/commands';
import { useEditorShortcuts } from './editor/use-editor-shortcuts';
import { useFlowEditor } from './editor/use-flow-editor';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { EdgeInspector } from './inspector/EdgeInspector';
import { NodeInspector } from './inspector/NodeInspector';
import { SelectionInspector } from './inspector/SelectionInspector';

export default function App() {
  const editor = useFlowEditor(checkoutFlow, checkoutLayout);
  const { flow, layout } = editor;

  const [selection, setSelection] = useState<CanvasSelection>({
    nodeIds: [],
    edgeIds: [],
  });
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  const selectedEdge = selectedCount === 1 ? (selectedEdges[0] ?? null) : null;

  useLayoutEffect(() => {
    if (focusCanvasAfterUpdate.current) {
      focusCanvasAfterUpdate.current = false;
      pendingLabelFocusId.current = null;
      canvasRef.current?.focus();
    } else if (selectedNode?.id === pendingLabelFocusId.current && nodeLabelInputRef.current) {
      nodeLabelInputRef.current.focus();
      nodeLabelInputRef.current.select();
      pendingLabelFocusId.current = null;
    }
  });

  function handleNodeAdd(kind: FlowNodeKind, position: FlowNodePosition, focusTarget: 'canvas' | 'label') {
    const nodeId = editor.addNode(kind, position);
    pendingLabelFocusId.current = focusTarget === 'label' ? nodeId : null;
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
  }

  function handleDocumentRestore(serialized: string): boolean {
    if (!editor.restoreDocument(serialized)) {
      return false;
    }

    setSelection({ nodeIds: [], edgeIds: [] });
    setCanvasRevision((current) => current + 1);
    focusCanvasAfterUpdate.current = true;

    return true;
  }

  // The factory stores these handlers; it never calls them during render.
  // eslint-disable-next-line react/refs
  const commands = createCommands({
    commands: () => {
      const active = document.activeElement;
      paletteReturnFocus.current = active instanceof HTMLElement || active instanceof SVGElement ? active : null;
      setPaletteOpen(true);
    },
    'new-flow': handleNewFlow,
    'rename-flow': () => {
      setRenamingFlowId(flow.id);
      nameInputRef.current?.focus();
    },
    save: editor.save,
    'open-json': () => filesRef.current?.open(),
    'export-json': () => filesRef.current?.export(),
    undo: () => { focusCanvasAfterUpdate.current = true; editor.undo(); },
    redo: () => { focusCanvasAfterUpdate.current = true; editor.redo(); },
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
  }, {
    'new-flow': !isRestoring,
    'rename-flow': !isRestoring,
    save: !isRestoring && (editor.hasUnsavedChanges || editor.storageError !== null),
    'open-json': !isRestoring,
    'export-json': !isRestoring,
    undo: editor.canUndo && !isRestoring,
    redo: editor.canRedo && !isRestoring,
    'reset-layout': !isRestoring && flow.nodes.length > 0,
    'fit-view': flow.nodes.length > 0,
    'select-all': selectedCount < flow.nodes.length + flow.edges.length,
    'delete-selection': selectedCount > 0 && !isRestoring,
    'add-screen': !isRestoring,
    'add-ui': !isRestoring,
    'add-action': !isRestoring,
    'add-service': !isRestoring,
    'add-state': !isRestoring,
  });

  if (editor.willReplaceInvalidDraft) commands.save = { ...commands.save, label: 'Replace local copy' };

  useEditorShortcuts({ workspaceRef, commands, platform, paletteOpen });

  return (
    <main ref={workspaceRef} className="grid min-h-dvh w-full grid-rows-[auto_minmax(0,1fr)] md:h-dvh">
      <EditorHeader
        commands={commands}
        platform={platform}
        hasUnsavedChanges={editor.hasUnsavedChanges}
        willReplaceInvalidDraft={editor.willReplaceInvalidDraft}
        storageError={editor.storageError}
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
            onRestore={handleDocumentRestore}
            isRestoring={isRestoring}
            onRestoringChange={setIsRestoring}
          />
        }
      />

      <div className="grid min-h-0 min-w-0 grid-rows-[minmax(28rem,1fr)_auto] md:grid-cols-[minmax(0,1fr)_17.5rem] md:grid-rows-[minmax(0,1fr)]">
        <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto]">
          <FlowCanvas
            key={`${flow.id}:${canvasRevision}`}
            ref={canvasRef}
            commands={commands}
            platform={platform}
            flow={flow}
            layout={layout}
            onLayoutChange={editor.updateLayout}
            onSelectionChange={setSelection}
            onNodeAdd={handleNodeAdd}
            onNodesConnect={editor.connectNodes}
          />

          <EditorStatusBar
            nodeCount={flow.nodes.length}
            edgeCount={flow.edges.length}
            commands={commands}
            platform={platform}
          />
        </div>
        {selectedCount > 1 ? (
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
            isEntry={selectedNode?.id === flow.entryNodeId}
            onNodeRename={editor.renameNode}
            onEntryNodeChange={editor.setEntryNode}
            onNodeDelete={handleNodeDelete}
          />
        )}
      </div>
      {paletteOpen && (
        <CommandPalette
          commands={Object.values(commands)}
          platform={platform}
          onClose={() => setPaletteOpen(false)}
          onRestoreFocus={() => {
            const previous = paletteReturnFocus.current;
            if (previous?.isConnected && previous !== document.body && !previous.matches(':disabled')) {
              previous.focus({ preventScroll: true });
            } else {
              commandsButtonRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      )}
    </main>
  );
}

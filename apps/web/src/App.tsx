import { useState } from 'react';
import type { CanvasSelection } from './canvas/canvas-selection';
import { FlowCanvas } from './canvas/FlowCanvas';
import { FlowFileActions } from './editor/FlowFileActions';
import { FlowNameEditor } from './editor/FlowNameEditor';
import { useFlowEditor } from './editor/use-flow-editor';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { EdgeInspector } from './inspector/EdgeInspector';
import { NodeInspector } from './inspector/NodeInspector';
import { SelectionInspector } from './inspector/SelectionInspector';
import { Button } from './ui/Button';

export default function App() {
  const {
    flow,
    layout,
    addNode,
    connectNodes,
    createFlow,
    renameFlow,
    renameNode,
    setEntryNode,
    setEdgeKind,
    updateLayout,
    resetLayout,
    deleteEdge,
    deleteNode,
    deleteElements,
    undo,
    redo,
    canUndo,
    canRedo,
    save,
    exportDocument,
    restoreDocument,
    storageError,
    hasUnsavedChanges,
    willReplaceInvalidDraft,
  } = useFlowEditor(checkoutFlow, checkoutLayout);

  const [selection, setSelection] = useState<CanvasSelection>({
    nodeIds: [],
    edgeIds: [],
  });
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);

  const selectedNodes = flow.nodes.filter((node) =>
    selection.nodeIds.includes(node.id),
  );

  const selectedEdges = flow.edges.filter((edge) =>
    selection.edgeIds.includes(edge.id),
  );

  const selectedCount = selectedNodes.length + selectedEdges.length;

  const selectedNode = selectedCount === 1 ? (selectedNodes[0] ?? null) : null;

  const selectedEdge = selectedCount === 1 ? (selectedEdges[0] ?? null) : null;

  function handleNodeDelete(nodeId: string) {
    deleteNode(nodeId);
    setSelection({ nodeIds: [], edgeIds: [] });
  }

  function handleEdgeDelete(edgeId: string) {
    deleteEdge(edgeId);
    setSelection({ nodeIds: [], edgeIds: [] });
  }

  function handleSelectionDelete() {
    deleteElements(
      selectedNodes.map((node) => node.id),
      selectedEdges.map((edge) => edge.id),
    );

    setSelection({ nodeIds: [], edgeIds: [] });
  }

  function handleNewFlow() {
    createFlow();
    setSelection({ nodeIds: [], edgeIds: [] });
  }

  function handleDocumentRestore(serialized: string): boolean {
    if (!restoreDocument(serialized)) {
      return false;
    }

    setSelection({ nodeIds: [], edgeIds: [] });
    setCanvasRevision((current) => current + 1);

    return true;
  }

  return (
    <main className="grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-7 py-5">
        <div>
          <p className="mb-1.5 text-[13px] font-bold text-brand">Statecraft</p>
          <FlowNameEditor
            key={`${flow.id}:${flow.name}`}
            name={flow.name}
            onRename={renameFlow}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-[13px] text-slate-500">
            {flow.nodes.length} nodes · {flow.edges.length} connections
          </p>

          <p role="status" className="text-xs text-slate-500">
            {hasUnsavedChanges ? 'Unsaved changes' : 'Saved locally'}
          </p>

          <Button
            onClick={handleNewFlow}
            disabled={isRestoring}
            title="Create an empty flow. This can be undone."
          >
            New flow
          </Button>

          <Button
            onClick={save}
            disabled={!hasUnsavedChanges && storageError === null}
          >
            {willReplaceInvalidDraft ? 'Replace local copy' : 'Save'}
          </Button>

          <FlowFileActions
            key={flow.id}
            flowName={flow.name}
            onExport={exportDocument}
            onRestore={handleDocumentRestore}
            isRestoring={isRestoring}
            onRestoringChange={setIsRestoring}
          />

          <div role="group" aria-label="Edit history" className="flex gap-2">
            <Button
              onClick={undo}
              disabled={!canUndo || isRestoring}
              variant="secondary"
            >
              Undo
            </Button>

            <Button
              onClick={redo}
              disabled={!canRedo || isRestoring}
              variant="secondary"
            >
              Redo
            </Button>
          </div>

          <Button onClick={resetLayout} variant="secondary">
            Reset layout
          </Button>
        </div>

        {storageError !== null && (
          <p role="alert" className="w-full text-sm text-red-700">
            {storageError}
          </p>
        )}
      </header>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_18rem] md:grid-rows-1">
        <FlowCanvas
          key={`${flow.id}:${canvasRevision}`}
          flow={flow}
          layout={layout}
          onLayoutChange={updateLayout}
          onSelectionChange={setSelection}
          onNodeAdd={addNode}
          onNodesConnect={connectNodes}
        />
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
            onEdgeKindChange={setEdgeKind}
            onEdgeDelete={handleEdgeDelete}
          />
        ) : (
          <NodeInspector
            node={selectedNode}
            isEntry={selectedNode?.id === flow.entryNodeId}
            onNodeRename={renameNode}
            onEntryNodeChange={setEntryNode}
            onNodeDelete={handleNodeDelete}
          />
        )}
      </div>
    </main>
  );
}

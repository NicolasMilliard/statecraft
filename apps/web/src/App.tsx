import { useState } from 'react';
import type { CanvasSelection } from './canvas/canvas-selection';
import { FlowCanvas } from './canvas/FlowCanvas';
import { FlowFileActions } from './editor/FlowFileActions';
import { useFlowEditor } from './editor/use-flow-editor';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { EdgeInspector } from './inspector/EdgeInspector';
import { NodeInspector } from './inspector/NodeInspector';
import { SelectionInspector } from './inspector/SelectionInspector';

export default function App() {
  const {
    flow,
    layout,
    addNode,
    connectNodes,
    renameNode,
    setEntryNode,
    setEdgeKind,
    updateLayout,
    resetLayout,
    deleteEdge,
    deleteNode,
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
          <h1 className="text-2xl font-bold">{flow.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-[13px] text-slate-500">
            Example flow · {flow.nodes.length} nodes · {flow.edges.length}{' '}
            connections
          </p>

          <p role="status" className="text-xs text-slate-500">
            {hasUnsavedChanges ? 'Unsaved changes' : 'Saved locally'}
          </p>

          <button
            type="button"
            onClick={save}
            disabled={!hasUnsavedChanges && storageError === null}
            className="cursor-pointer rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {willReplaceInvalidDraft ? 'Replace local copy' : 'Save'}
          </button>

          <FlowFileActions
            flowName={flow.name}
            onExport={exportDocument}
            onRestore={handleDocumentRestore}
          />

          <div role="group" aria-label="Edit history" className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              Undo
            </button>

            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              Redo
            </button>
          </div>

          <button
            type="button"
            onClick={resetLayout}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Reset layout
          </button>
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

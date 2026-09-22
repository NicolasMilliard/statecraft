import { useState } from 'react';
import type { CanvasSelection } from './canvas/canvas-selection';
import { FlowCanvas } from './canvas/FlowCanvas';
import { useFlowEditor } from './editor/use-flow-editor';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { EdgeInspector } from './inspector/EdgeInspector';
import { NodeInspector } from './inspector/NodeInspector';

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
    storageError,
    hasUnsavedChanges,
    willReplaceInvalidDraft,
  } = useFlowEditor(checkoutFlow, checkoutLayout);

  const [selection, setSelection] = useState<CanvasSelection>(null);

  const selectedNode =
    selection?.type === 'node'
      ? (flow.nodes.find((node) => node.id === selection.id) ?? null)
      : null;

  const selectedEdge =
    selection?.type === 'edge'
      ? (flow.edges.find((edge) => edge.id === selection.id) ?? null)
      : null;

  function handleNodeDelete(nodeId: string) {
    deleteNode(nodeId);
    setSelection(null);
  }

  function handleEdgeDelete(edgeId: string) {
    deleteEdge(edgeId);
    setSelection(null);
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
          key={flow.id}
          flow={flow}
          layout={layout}
          onLayoutChange={updateLayout}
          onSelectionChange={setSelection}
          onNodeAdd={addNode}
          onNodesConnect={connectNodes}
        />
        {selectedEdge !== null ? (
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

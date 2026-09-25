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
    <main className="grid min-h-dvh w-full grid-rows-[auto_minmax(0,1fr)] md:h-dvh">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-chrome px-4 py-3 lg:px-5">
        <div className="flex min-w-0 flex-1 basis-80 items-center gap-3">
          <p className="shrink-0 text-sm font-semibold tracking-tight">
            statecraft
          </p>
          <span aria-hidden="true" className="text-border-strong">
            /
          </span>
          <FlowNameEditor
            key={`${flow.id}:${flow.name}`}
            name={flow.name}
            onRename={renameFlow}
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p role="status" className="mr-2 text-xs text-muted">
            {hasUnsavedChanges ? 'Unsaved changes' : 'Saved locally'}
          </p>

          <Button
            variant="secondary"
            onClick={handleNewFlow}
            disabled={isRestoring}
            title="Create an empty flow. This can be undone."
          >
            New flow
          </Button>

          <FlowFileActions
            key={flow.id}
            flowName={flow.name}
            onExport={exportDocument}
            onRestore={handleDocumentRestore}
            isRestoring={isRestoring}
            onRestoringChange={setIsRestoring}
          />

          <Button
            onClick={save}
            disabled={!hasUnsavedChanges && storageError === null}
          >
            {willReplaceInvalidDraft ? 'Replace local copy' : 'Save'}
          </Button>
        </div>

        {storageError !== null && (
          <p role="alert" className="w-full text-ui text-danger">
            {storageError}
          </p>
        )}
      </header>

      <div className="grid min-h-0 min-w-0 grid-rows-[minmax(28rem,1fr)_auto] md:grid-cols-[minmax(0,1fr)_17.5rem] md:grid-rows-[minmax(0,1fr)]">
        <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto]">
          <FlowCanvas
            key={`${flow.id}:${canvasRevision}`}
            flow={flow}
            layout={layout}
            onLayoutChange={updateLayout}
            onSelectionChange={setSelection}
            onNodeAdd={addNode}
            onNodesConnect={connectNodes}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-chrome px-4 py-2">
            <p className="text-xs text-muted">
              {flow.nodes.length} nodes · {flow.edges.length} connections
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label="Edit history" className="flex gap-1">
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
          </div>
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

import { useState } from 'react';
import { FlowCanvas } from './canvas/FlowCanvas';
import { useFlowEditor } from './editor/use-flow-editor';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { NodeInspector } from './inspector/NodeInspector';

export default function App() {
  const {
    flow,
    layout,
    addNode,
    renameNode,
    setEntryNode,
    updateLayout,
    resetLayout,
  } = useFlowEditor(checkoutFlow, checkoutLayout);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode =
    flow.nodes.find((node) => node.id === selectedNodeId) ?? null;

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

          <button
            type="button"
            onClick={resetLayout}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Reset layout
          </button>
        </div>
      </header>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_18rem] md:grid-rows-1">
        <FlowCanvas
          key={flow.id}
          flow={flow}
          layout={layout}
          onLayoutChange={updateLayout}
          onNodeSelectionChange={setSelectedNodeId}
          onNodeAdd={addNode}
        />

        <NodeInspector
          node={selectedNode}
          isEntry={selectedNode?.id === flow.entryNodeId}
          onNodeRename={renameNode}
          onEntryNodeChange={setEntryNode}
        />
      </div>
    </main>
  );
}

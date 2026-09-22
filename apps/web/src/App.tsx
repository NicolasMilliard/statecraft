import type { Flow } from '@statecraft/core';
import { useState } from 'react';
import { FlowCanvas } from './canvas/FlowCanvas';
import type { FlowLayout } from './canvas/flow-layout';
import { checkoutFlow, checkoutLayout } from './examples/checkout';
import { NodeInspector } from './inspector/NodeInspector';

export default function App() {
  const [flow, setFlow] = useState<Flow>(checkoutFlow);
  const [layout, setLayout] = useState<FlowLayout>(checkoutLayout);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode =
    flow.nodes.find((node) => node.id === selectedNodeId) ?? null;

  function handleNodeRename(nodeId: string, label: string) {
    const normalizedLabel = label.trim();

    if (normalizedLabel.length === 0) {
      return;
    }

    setFlow((currentFlow) => {
      const targetNode = currentFlow.nodes.find((node) => node.id === nodeId);

      if (targetNode === undefined || targetNode.label === normalizedLabel) {
        return currentFlow;
      }

      return {
        ...currentFlow,
        nodes: currentFlow.nodes.map((node) =>
          node.id === nodeId ? { ...node, label: normalizedLabel } : node,
        ),
      };
    });
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

          <button
            type="button"
            onClick={() => setLayout(checkoutLayout)}
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
          onLayoutChange={setLayout}
          onNodeSelectionChange={setSelectedNodeId}
        />

        <NodeInspector
          node={selectedNode}
          isEntry={selectedNode?.id === flow.entryNodeId}
          onNodeRename={handleNodeRename}
        />
      </div>
    </main>
  );
}

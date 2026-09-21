import type { Flow } from '@statecraft/core';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import type { FlowLayout } from './flow-layout';
import { toReactFlowGraph, type CanvasNode } from './to-react-flow-graph';

interface FlowCanvasProps {
  readonly flow: Flow;
  readonly layout: FlowLayout;
}

export function FlowCanvas({ flow, layout }: FlowCanvasProps) {
  const graph = useMemo(() => toReactFlowGraph(flow, layout), [flow, layout]);

  return (
    <section className="flow-canvas" aria-label={`${flow.name} flow diagram`}>
      <ReactFlow<CanvasNode>
        nodes={graph.nodes}
        edges={graph.edges}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.5}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </section>
  );
}

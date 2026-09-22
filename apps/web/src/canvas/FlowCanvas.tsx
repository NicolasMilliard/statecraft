import type { Flow } from '@statecraft/core';
import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  type OnNodeDrag,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo } from 'react';
import type { FlowLayout } from './flow-layout';
import { toReactFlowGraph, type CanvasNode } from './to-react-flow-graph';

interface FlowCanvasProps {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly onLayoutChange: (layout: FlowLayout) => void;
}

export function FlowCanvas({ flow, layout, onLayoutChange }: FlowCanvasProps) {
  const graph = useMemo(() => toReactFlowGraph(flow, layout), [flow, layout]);

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(
    graph.nodes,
  );

  useEffect(() => {
    const { nodes: nextNodes } = toReactFlowGraph(flow, layout);

    setNodes((currentNodes) => {
      const currentNodesById = new Map(
        currentNodes.map((node) => [node.id, node]),
      );

      return nextNodes.map((node) => {
        const currentNode = currentNodesById.get(node.id);

        // Preserve renderer state, including measured dimensions.
        return currentNode === undefined ? node : { ...currentNode, ...node };
      });
    });
  }, [flow, layout, setNodes]);

  const handleNodeDragStop = useCallback<OnNodeDrag<CanvasNode>>(
    (_event, _node, draggedNodes) => {
      const positions = { ...layout.positions };

      for (const node of draggedNodes) {
        if (positions[node.id] === undefined) {
          continue;
        }

        positions[node.id] = {
          x: node.position.x,
          y: node.position.y,
        };
      }

      onLayoutChange({
        ...layout,
        positions,
      });
    },
    [layout, onLayoutChange],
  );

  return (
    <section
      className="h-full min-h-0 w-full"
      aria-label={`${flow.name} flow diagram`}
    >
      <ReactFlow<CanvasNode>
        nodes={nodes}
        edges={graph.edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        nodesDraggable
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

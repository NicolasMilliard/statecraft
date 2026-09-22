import type { Flow } from '@statecraft/core';
import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo } from 'react';
import type { FlowLayout } from './flow-layout';
import { toReactFlowGraph, type CanvasNode } from './to-react-flow-graph';

interface FlowCanvasProps {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly onLayoutChange: (layout: FlowLayout) => void;
  readonly onNodeSelectionChange: (nodeId: string | null) => void;
}

export function FlowCanvas({
  flow,
  layout,
  onLayoutChange,
  onNodeSelectionChange,
}: FlowCanvasProps) {
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

        // Preserve renderer state, including selection and dimensions.
        return currentNode === undefined ? node : { ...currentNode, ...node };
      });
    });
  }, [flow, layout, setNodes]);

  const handleNodesChange = useCallback<OnNodesChange<CanvasNode>>(
    (changes) => {
      onNodesChange(changes);

      const positions = { ...layout.positions };
      let hasPositionChange = false;

      for (const change of changes) {
        if (
          change.type !== 'position' ||
          change.dragging === true ||
          change.position === undefined
        ) {
          continue;
        }

        const currentPosition = positions[change.id];

        if (
          currentPosition === undefined ||
          (currentPosition.x === change.position.x &&
            currentPosition.y === change.position.y)
        ) {
          continue;
        }

        positions[change.id] = { ...change.position };
        hasPositionChange = true;
      }

      if (hasPositionChange) {
        onLayoutChange({
          ...layout,
          positions,
        });
      }
    },
    [layout, onLayoutChange, onNodesChange],
  );

  const handleSelectionChange = useCallback<OnSelectionChangeFunc<CanvasNode>>(
    ({ nodes: selectedNodes }) => {
      onNodeSelectionChange(selectedNodes[0]?.id ?? null);
    },
    [onNodeSelectionChange],
  );

  return (
    <section
      className="h-full min-h-0 w-full min-w-0"
      aria-label={`${flow.name} flow diagram`}
    >
      <ReactFlow<CanvasNode>
        nodes={nodes}
        edges={graph.edges}
        onNodesChange={handleNodesChange}
        onSelectionChange={handleSelectionChange}
        nodesDraggable
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        selectionOnDrag={false}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
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

import type { Flow, FlowNodeKind } from '@statecraft/core';
import {
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  useNodesState,
  type IsValidConnection,
  type OnConnect,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo } from 'react';
import { canAddFlowEdge } from '../editor/can-add-flow-edge';
import type { FlowLayout, FlowNodePosition } from './flow-layout';
import { NodePalette } from './NodePalette';
import { toReactFlowGraph, type CanvasNode } from './to-react-flow-graph';

interface FlowCanvasProps {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly onLayoutChange: (layout: FlowLayout) => void;
  readonly onNodeSelectionChange: (nodeId: string | null) => void;
  readonly onNodeAdd: (kind: FlowNodeKind, position: FlowNodePosition) => void;
  readonly onNodesConnect: (sourceNodeId: string, targetNodeId: string) => void;
}

export function FlowCanvas({
  flow,
  layout,
  onLayoutChange,
  onNodeSelectionChange,
  onNodeAdd,
  onNodesConnect,
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

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) =>
      canAddFlowEdge(flow, connection.source, connection.target, 'transition'),
    [flow],
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      onNodesConnect(connection.source, connection.target);
    },
    [onNodesConnect],
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
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        nodesDraggable
        nodesConnectable
        connectOnClick
        connectionMode={ConnectionMode.Strict}
        connectionLineType={ConnectionLineType.SmoothStep}
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
        <NodePalette onNodeAdd={onNodeAdd} />
      </ReactFlow>
    </section>
  );
}

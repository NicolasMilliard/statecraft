import type { Flow, FlowNodeKind } from '@statecraft/core';
import {
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type IsValidConnection,
  type OnConnect,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo } from 'react';
import { canAddFlowEdge } from '../editor/can-add-flow-edge';
import type { CanvasSelection } from './canvas-selection';
import type { FlowLayout, FlowNodePosition } from './flow-layout';
import { NodePalette } from './NodePalette';
import { toReactFlowGraph, type CanvasNode } from './to-react-flow-graph';

interface FlowCanvasProps {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly onLayoutChange: (layout: FlowLayout) => void;
  readonly onSelectionChange: (selection: CanvasSelection) => void;
  readonly onNodeAdd: (kind: FlowNodeKind, position: FlowNodePosition) => void;
  readonly onNodesConnect: (sourceNodeId: string, targetNodeId: string) => void;
}

export function FlowCanvas({
  flow,
  layout,
  onLayoutChange,
  onSelectionChange,
  onNodeAdd,
  onNodesConnect,
}: FlowCanvasProps) {
  const graph = useMemo(() => toReactFlowGraph(flow, layout), [flow, layout]);

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(
    graph.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    const { nodes: nextNodes, edges: nextEdges } = toReactFlowGraph(
      flow,
      layout,
    );

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

    setEdges((currentEdges) => {
      const currentEdgesById = new Map(
        currentEdges.map((edge) => [edge.id, edge]),
      );

      return nextEdges.map((edge) => {
        const currentEdge = currentEdgesById.get(edge.id);

        // Preserve selection when domain properties change.
        return currentEdge === undefined ? edge : { ...currentEdge, ...edge };
      });
    });
  }, [flow, layout, setNodes, setEdges]);

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
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      const node = selectedNodes[0];
      const edge = selectedEdges[0];

      if (node !== undefined) {
        onSelectionChange({ type: 'node', id: node.id });
        return;
      }

      if (edge !== undefined) {
        onSelectionChange({ type: 'edge', id: edge.id });
        return;
      }

      onSelectionChange(null);
    },
    [onSelectionChange],
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
        edges={edges}
        onEdgesChange={onEdgesChange}
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

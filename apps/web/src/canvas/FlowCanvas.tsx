import type { Flow, FlowNodeKind } from '@statecraft/core';
import {
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type IsValidConnection,
  type OnConnect,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from 'react';
import { canAddFlowEdge } from '../editor/can-add-flow-edge';
import type { CanvasSelection } from './canvas-selection';
import type { FlowLayout, FlowNodePosition } from './flow-layout';
import { NODE_KIND_MIME_TYPE, parseDraggedNodeKind } from './node-drag';
import { NodePalette } from './NodePalette';
import { StatecraftEdge } from './StatecraftEdge';
import { StatecraftNode } from './StatecraftNode';
import {
  toReactFlowGraph,
  type CanvasEdge,
  type CanvasNode,
} from './to-react-flow-graph';

const nodeTypes = { statecraft: StatecraftNode };
const edgeTypes = { statecraft: StatecraftEdge };

interface FlowCanvasProps {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly onLayoutChange: (layout: FlowLayout) => void;
  readonly onSelectionChange: (selection: CanvasSelection) => void;
  readonly onNodeAdd: (kind: FlowNodeKind, position: FlowNodePosition) => void;
  readonly onNodesConnect: (sourceNodeId: string, targetNodeId: string) => void;
}

function canDropPaletteNode(event: DragEvent<HTMLDivElement>): boolean {
  const target = event.target;

  return (
    event.dataTransfer.types.includes(NODE_KIND_MIME_TYPE) &&
    !(
      target instanceof Element && target.closest('.react-flow__panel') !== null
    )
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasContent {...props} />
    </ReactFlowProvider>
  );
}

function FlowCanvasContent({
  flow,
  layout,
  onLayoutChange,
  onSelectionChange,
  onNodeAdd,
  onNodesConnect,
}: FlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow<CanvasNode>();
  const [fitViewOnMount] = useState(() => flow.nodes.length > 0);

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
      onSelectionChange({
        nodeIds: selectedNodes.map((node) => node.id),
        edgeIds: selectedEdges.map((edge) => edge.id),
      });
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

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    event.dataTransfer.dropEffect = canDropPaletteNode(event) ? 'copy' : 'none';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!canDropPaletteNode(event)) {
        return;
      }

      const kind = parseDraggedNodeKind(
        event.dataTransfer.getData(NODE_KIND_MIME_TYPE),
      );

      if (kind === null) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onNodeAdd(kind, position);
    },
    [onNodeAdd, screenToFlowPosition],
  );

  return (
    <section
      className="h-full min-h-0 w-full min-w-0"
      aria-label={`${flow.name} flow diagram`}
    >
      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onEdgesChange={onEdgesChange}
        onNodesChange={handleNodesChange}
        onSelectionChange={handleSelectionChange}
        onConnect={handleConnect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        isValidConnection={isValidConnection}
        nodesDraggable
        nodesConnectable
        connectOnClick
        connectionMode={ConnectionMode.Strict}
        connectionLineType={ConnectionLineType.SmoothStep}
        edgesReconnectable={false}
        elementsSelectable
        selectionOnDrag={false}
        selectionKeyCode="Shift"
        deleteKeyCode={null}
        fitView={fitViewOnMount}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.5}
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} />
        <NodePalette onNodeAdd={onNodeAdd} />
      </ReactFlow>
    </section>
  );
}

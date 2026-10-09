import type { Flow, FlowNodeKind } from '@statecraft/core';
import {
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ControlButton,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
  type IsValidConnection,
  type OnConnect,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type DragEvent,
} from 'react';
import { canAddFlowEdge } from '../editor/can-add-flow-edge';
import type { CommandRegistry, ShortcutPlatform } from '../editor/commands';
import { runCommand } from '../editor/commands';
import type { CanvasSelection } from './canvas-selection';
import type { FlowLayout, FlowNodePosition } from './flow-layout';
import { NODE_KIND_MIME_TYPE, parseDraggedNodeKind } from './node-drag';
import { NodePalette } from './NodePalette';
import { CanvasEmptyState } from './CanvasEmptyState';
import { StatecraftEdge } from './StatecraftEdge';
import { StatecraftNode } from './StatecraftNode';
import { syncCanvasEdges, syncCanvasNodes } from './sync-canvas-graph';
import {
  toReactFlowGraph,
  CANVAS_NODE_WIDTH,
  CANVAS_NODE_MIN_HEIGHT,
  type CanvasEdge,
  type CanvasNode,
} from './to-react-flow-graph';

const nodeTypes = { statecraft: StatecraftNode };
const edgeTypes = { statecraft: StatecraftEdge };

export interface FlowCanvasHandle {
  addNode: (kind: FlowNodeKind) => void;
  selectAll: () => void;
  cancel: () => void;
  fitView: () => void;
  focus: () => void;
}

export interface CanvasPlayback {
  readonly currentNodeId: string | null;
  readonly visitedNodeIds: readonly string[];
  readonly currentEdgeId: string | null;
  readonly visitedEdgeIds: readonly string[];
}

interface FlowCanvasProps {
  readonly ref?: Ref<FlowCanvasHandle>;
  readonly commands: CommandRegistry;
  readonly platform: ShortcutPlatform;
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly playback: CanvasPlayback | null;
  readonly onLayoutChange: (layout: FlowLayout) => void;
  readonly onSelectionChange: (selection: CanvasSelection) => void;
  readonly onNodeAdd: (kind: FlowNodeKind, position: FlowNodePosition, focusTarget: 'canvas' | 'label') => string;
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
  ref,
  commands,
  platform,
  flow,
  layout,
  playback,
  onLayoutChange,
  onSelectionChange,
  onNodeAdd,
  onNodesConnect,
}: FlowCanvasProps) {
  const { screenToFlowPosition, getNodes, getNodesBounds, getZoom, setCenter, fitView } = useReactFlow<CanvasNode>();
  const store = useStoreApi();
  const sectionRef = useRef<HTMLElement>(null);
  const connectionCancelled = useRef(false);
  const addedNodeId = useRef<string | null>(null);
  const [fitViewOnMount] = useState(() => flow.nodes.length > 0);

  const graph = useMemo<{ nodes: CanvasNode[]; edges: CanvasEdge[] }>(() => {
    const base = toReactFlowGraph(flow, layout);
    const visitedNodes = new Set(playback?.visitedNodeIds ?? []);
    const visitedEdges = new Set(playback?.visitedEdgeIds ?? []);

    return {
      nodes: base.nodes.map((node) => ({
        ...node,
        className: node.id === playback?.currentNodeId
          ? 'run-current'
          : visitedNodes.has(node.id) ? 'run-visited' : '',
      })),
      edges: base.edges.map((edge) => ({
        ...edge,
        className: edge.id === playback?.currentEdgeId
          ? 'run-current'
          : visitedEdges.has(edge.id) ? 'run-visited' : '',
      })),
    };
  }, [flow, layout, playback]);

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(
    graph.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useImperativeHandle(ref, () => ({
    focus: () => sectionRef.current?.focus({ preventScroll: true }),
    fitView: () => { void fitView({ padding: 0.2 }); },
    selectAll: () => {
      setNodes((current) => current.map((node) => ({ ...node, selected: true })));
      setEdges((current) => current.map((edge) => ({ ...edge, selected: true })));
      sectionRef.current?.focus({ preventScroll: true });
    },
    cancel: () => {
      const state = store.getState();
      if (state.connection.inProgress || state.connectionClickStartHandle !== null) {
        // XYFlow may still deliver the pointer-up callback after cancellation.
        connectionCancelled.current = true;
        state.cancelConnection();
        store.setState({ connectionClickStartHandle: null });
        return;
      }
      setNodes((current) => current.map((node) => ({ ...node, selected: false })));
      setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
    },
    addNode: (kind) => {
      const current = getNodes();
      const bounds = getNodesBounds(current);
      const position = current.length === 0 ? { x: 0, y: 0 } : {
        x: bounds.x + bounds.width + 80,
        y: bounds.y + bounds.height / 2 - CANVAS_NODE_MIN_HEIGHT / 2,
      };
      addedNodeId.current = onNodeAdd(kind, position, 'label');
      void setCenter(position.x + CANVAS_NODE_WIDTH / 2, position.y + CANVAS_NODE_MIN_HEIGHT / 2, { zoom: getZoom() });
    },
  }));

  useEffect(() => {
    const nodeToSelect = addedNodeId.current;
    addedNodeId.current = null;

    setNodes((current) => syncCanvasNodes(current, graph.nodes, nodeToSelect));
    setEdges((current) => syncCanvasEdges(current, graph.edges, nodeToSelect !== null));
  }, [graph, setNodes, setEdges]);

  const handleNodesChange = useCallback<OnNodesChange<CanvasNode>>(
    (changes) => {
      onNodesChange(changes);

      let positions: Record<string, FlowNodePosition> | undefined;

      for (const change of changes) {
        if (
          change.type !== 'position' ||
          change.dragging === true ||
          change.position === undefined
        ) {
          continue;
        }

        const currentPosition = (positions ?? layout.positions)[change.id];

        if (
          currentPosition === undefined ||
          (currentPosition.x === change.position.x &&
            currentPosition.y === change.position.y)
        ) {
          continue;
        }

        positions ??= { ...layout.positions };
        positions[change.id] = { ...change.position };
      }

      if (positions !== undefined) {
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
      if (connectionCancelled.current) return;
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

      addedNodeId.current = onNodeAdd(kind, position, 'canvas');
      sectionRef.current?.focus({ preventScroll: true });
    },
    [onNodeAdd, screenToFlowPosition],
  );

  return (
    <section
      ref={sectionRef}
      tabIndex={0}
      data-canvas-surface
      className="h-full min-h-0 w-full min-w-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      aria-label={`${flow.name} flow diagram`}
      onPointerDownCapture={(event) => {
        if (event.target instanceof Element && event.target.closest('.react-flow__pane') !== null) {
          sectionRef.current?.focus({ preventScroll: true });
        }
      }}
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
        onConnectStart={() => { connectionCancelled.current = false; }}
        onClickConnectStart={() => { connectionCancelled.current = false; }}
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
        {flow.nodes.length === 0 && <CanvasEmptyState commands={commands} platform={platform} />}
        <Controls showInteractive={false} showFitView={false}>
          <ControlButton aria-label="Fit View" title="Fit view" disabled={!commands['fit-view'].enabled} onClick={() => runCommand(commands['fit-view'])}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4v1H3v3zm8-4h4v4h-1V3h-3zM2 10h1v3h3v1H2zm11 0h1v4h-4v-1h3z" /></svg>
          </ControlButton>
        </Controls>
        <NodePalette commands={commands} platform={platform} />
      </ReactFlow>
    </section>
  );
}

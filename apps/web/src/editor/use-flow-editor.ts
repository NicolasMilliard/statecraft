import type {
  Flow,
  FlowEdge,
  FlowEdgeKind,
  FlowNode,
  FlowNodeKind,
} from '@statecraft/core';
import { useCallback } from 'react';
import type { FlowLayout, FlowNodePosition } from '../canvas/flow-layout';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { canAddFlowEdge } from './can-add-flow-edge';
import { useHistoryState } from './use-history-state';

interface FlowEditorState {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly initialLayout: FlowLayout;
}

function areLayoutsEqual(left: FlowLayout, right: FlowLayout): boolean {
  const entries = Object.entries(left.positions);

  if (
    left.flowId !== right.flowId ||
    entries.length !== Object.keys(right.positions).length
  ) {
    return false;
  }

  return entries.every(([nodeId, position]) => {
    const otherPosition = right.positions[nodeId];

    return position.x === otherPosition?.x && position.y === otherPosition?.y;
  });
}

export function useFlowEditor(initialFlow: Flow, initialLayout: FlowLayout) {
  const {
    state: editor,
    setState: setEditor,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<FlowEditorState>(() => ({
    flow: initialFlow,
    layout: initialLayout,
    initialLayout,
  }));

  function addNode(kind: FlowNodeKind, position: FlowNodePosition) {
    const node: FlowNode = {
      id: crypto.randomUUID(),
      kind,
      label: `New ${NODE_KIND_LABELS[kind]}`,
    };

    const initialPosition = { ...position };

    setEditor((current) => ({
      ...current,
      flow: {
        ...current.flow,
        nodes: [...current.flow.nodes, node],
      },
      layout: {
        ...current.layout,
        positions: {
          ...current.layout.positions,
          [node.id]: initialPosition,
        },
      },
      initialLayout: {
        ...current.initialLayout,
        positions: {
          ...current.initialLayout.positions,
          [node.id]: initialPosition,
        },
      },
    }));
  }

  const connectNodes = useCallback(
    (sourceNodeId: string, targetNodeId: string) => {
      const edge: FlowEdge = {
        id: crypto.randomUUID(),
        sourceNodeId,
        targetNodeId,
        kind: 'transition',
      };

      setEditor((current) => {
        if (
          !canAddFlowEdge(current.flow, sourceNodeId, targetNodeId, edge.kind)
        ) {
          return current;
        }

        return {
          ...current,
          flow: {
            ...current.flow,
            edges: [...current.flow.edges, edge],
          },
        };
      });
    },
    [setEditor],
  );

  function renameNode(nodeId: string, label: string) {
    const normalizedLabel = label.trim();

    if (normalizedLabel.length === 0) {
      return;
    }

    setEditor((current) => {
      const targetNode = current.flow.nodes.find((node) => node.id === nodeId);

      if (targetNode === undefined || targetNode.label === normalizedLabel) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          nodes: current.flow.nodes.map((node) =>
            node.id === nodeId ? { ...node, label: normalizedLabel } : node,
          ),
        },
      };
    });
  }

  function setEntryNode(nodeId: string | null) {
    setEditor((current) => {
      if (current.flow.entryNodeId === nodeId) {
        return current;
      }

      if (
        nodeId !== null &&
        !current.flow.nodes.some((node) => node.id === nodeId)
      ) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          entryNodeId: nodeId,
        },
      };
    });
  }

  function setEdgeKind(edgeId: string, kind: FlowEdgeKind) {
    setEditor((current) => {
      const targetEdge = current.flow.edges.find((edge) => edge.id === edgeId);

      if (targetEdge === undefined || targetEdge.kind === kind) {
        return current;
      }

      if (
        !canAddFlowEdge(
          current.flow,
          targetEdge.sourceNodeId,
          targetEdge.targetNodeId,
          kind,
          edgeId,
        )
      ) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          edges: current.flow.edges.map((edge) =>
            edge.id === edgeId ? { ...edge, kind } : edge,
          ),
        },
      };
    });
  }

  function deleteEdge(edgeId: string) {
    setEditor((current) => {
      if (!current.flow.edges.some((edge) => edge.id === edgeId)) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          edges: current.flow.edges.filter((edge) => edge.id !== edgeId),
        },
      };
    });
  }

  function deleteNode(nodeId: string) {
    setEditor((current) => {
      if (!current.flow.nodes.some((node) => node.id === nodeId)) {
        return current;
      }

      const positions = { ...current.layout.positions };
      const initialPositions = { ...current.initialLayout.positions };

      delete positions[nodeId];
      delete initialPositions[nodeId];

      return {
        ...current,
        flow: {
          ...current.flow,
          entryNodeId:
            current.flow.entryNodeId === nodeId
              ? null
              : current.flow.entryNodeId,
          nodes: current.flow.nodes.filter((node) => node.id !== nodeId),
          edges: current.flow.edges.filter(
            (edge) =>
              edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId,
          ),
          codeReferences: current.flow.codeReferences.filter(
            (reference) => reference.flowNodeId !== nodeId,
          ),
        },
        layout: {
          ...current.layout,
          positions,
        },
        initialLayout: {
          ...current.initialLayout,
          positions: initialPositions,
        },
      };
    });
  }

  const updateLayout = useCallback(
    (nextLayout: FlowLayout) => {
      setEditor((current) => {
        if (
          nextLayout.flowId !== current.flow.id ||
          areLayoutsEqual(current.layout, nextLayout)
        ) {
          return current;
        }

        return {
          ...current,
          layout: nextLayout,
        };
      });
    },
    [setEditor],
  );

  function resetLayout() {
    setEditor((current) => {
      if (areLayoutsEqual(current.layout, current.initialLayout)) {
        return current;
      }

      return {
        ...current,
        layout: current.initialLayout,
      };
    });
  }

  return {
    flow: editor.flow,
    layout: editor.layout,
    addNode,
    connectNodes,
    renameNode,
    setEntryNode,
    setEdgeKind,
    deleteNode,
    deleteEdge,
    undo,
    redo,
    canUndo,
    canRedo,
    updateLayout,
    resetLayout,
  };
}

import type {
  Flow,
  FlowEdge,
  FlowEdgeKind,
  FlowNode,
  FlowNodeKind,
} from '@statecraft/core';
import { useCallback, useState } from 'react';
import type { FlowLayout, FlowNodePosition } from '../canvas/flow-layout';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { canAddFlowEdge } from './can-add-flow-edge';

interface FlowEditorState {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly initialLayout: FlowLayout;
}

export function useFlowEditor(initialFlow: Flow, initialLayout: FlowLayout) {
  const [editor, setEditor] = useState<FlowEditorState>(() => ({
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
    [],
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

  const updateLayout = useCallback((nextLayout: FlowLayout) => {
    setEditor((current) => {
      if (nextLayout.flowId !== current.flow.id) {
        return current;
      }

      return {
        ...current,
        layout: nextLayout,
      };
    });
  }, []);

  function resetLayout() {
    setEditor((current) => ({
      ...current,
      layout: current.initialLayout,
    }));
  }

  return {
    flow: editor.flow,
    layout: editor.layout,
    addNode,
    connectNodes,
    renameNode,
    setEntryNode,
    setEdgeKind,
    updateLayout,
    resetLayout,
  };
}

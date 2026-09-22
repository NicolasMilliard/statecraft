import type { Flow, FlowNode, FlowNodeKind } from '@statecraft/core';
import { useCallback, useState } from 'react';
import type { FlowLayout, FlowNodePosition } from '../canvas/flow-layout';
import { NODE_KIND_LABELS } from '../node-kind-labels';

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
    renameNode,
    setEntryNode,
    updateLayout,
    resetLayout,
  };
}

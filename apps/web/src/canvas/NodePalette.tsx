import { FLOW_NODE_KINDS, type FlowNodeKind } from '@statecraft/core';
import { Panel, useReactFlow } from '@xyflow/react';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { Button } from '../ui/Button';
import type { FlowNodePosition } from './flow-layout';
import { NODE_KIND_MIME_TYPE } from './node-drag';
import {
  CANVAS_NODE_MIN_HEIGHT,
  CANVAS_NODE_WIDTH,
  type CanvasNode,
} from './to-react-flow-graph';

interface NodePaletteProps {
  readonly onNodeAdd: (kind: FlowNodeKind, position: FlowNodePosition) => void;
}

export function NodePalette({ onNodeAdd }: NodePaletteProps) {
  const { getNodes, getNodesBounds, getZoom, setCenter } =
    useReactFlow<CanvasNode>();

  function handleAdd(kind: FlowNodeKind) {
    const nodes = getNodes();
    const bounds = getNodesBounds(nodes);

    const position: FlowNodePosition =
      nodes.length === 0
        ? { x: 0, y: 0 }
        : {
            x: bounds.x + bounds.width + 80,
            y: bounds.y + bounds.height / 2 - CANVAS_NODE_MIN_HEIGHT / 2,
          };

    onNodeAdd(kind, position);

    void setCenter(
      position.x + CANVAS_NODE_WIDTH / 2,
      position.y + CANVAS_NODE_MIN_HEIGHT / 2,
      { zoom: getZoom() },
    );
  }

  return (
    <Panel
      position="top-left"
      className="nopan max-w-[calc(100%-1rem)] rounded-xl border border-border bg-surface p-3 shadow-sm"
    >
      <p className="text-xs font-semibold text-muted">Add node</p>
      <p className="mb-2 mt-1 text-xs text-muted">
        Drag onto the canvas or click to add.
      </p>

      <div role="group" aria-label="Add node" className="flex flex-wrap gap-2">
        {FLOW_NODE_KINDS.map((kind) => (
          <Button
            key={kind}
            variant="secondary"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(NODE_KIND_MIME_TYPE, kind);
              event.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => handleAdd(kind)}
            aria-label={`Add ${NODE_KIND_LABELS[kind]} node`}
          >
            {NODE_KIND_LABELS[kind]}
          </Button>
        ))}
      </div>
    </Panel>
  );
}

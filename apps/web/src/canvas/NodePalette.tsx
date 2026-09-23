import { FLOW_NODE_KINDS, type FlowNodeKind } from '@statecraft/core';
import { Panel, useReactFlow } from '@xyflow/react';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import type { FlowNodePosition } from './flow-layout';
import { NODE_KIND_MIME_TYPE } from './node-drag';
import type { CanvasNode } from './to-react-flow-graph';

interface NodePaletteProps {
  readonly onNodeAdd: (kind: FlowNodeKind, position: FlowNodePosition) => void;
}

export function NodePalette({ onNodeAdd }: NodePaletteProps) {
  const { getNodes, getNodesBounds, getZoom, setCenter } =
    useReactFlow<CanvasNode>();

  function handleAdd(kind: FlowNodeKind) {
    const nodes = getNodes();
    const bounds = getNodesBounds(nodes);

    // Default nodes are 180px wide and approximately 54px tall.
    const position: FlowNodePosition =
      nodes.length === 0
        ? { x: 0, y: 0 }
        : {
            x: bounds.x + bounds.width + 80,
            y: bounds.y + bounds.height / 2 - 27,
          };

    onNodeAdd(kind, position);

    void setCenter(position.x + 90, position.y + 27, {
      zoom: getZoom(),
    });
  }

  return (
    <Panel
      position="top-left"
      className="nopan max-w-[calc(100%-1rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <p className="text-xs font-semibold text-slate-500">Add node</p>
      <p className="mb-2 mt-1 text-xs text-slate-500">
        Drag onto the canvas or click to add.
      </p>

      <div role="group" aria-label="Add node" className="flex flex-wrap gap-2">
        {FLOW_NODE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(NODE_KIND_MIME_TYPE, kind);
              event.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => handleAdd(kind)}
            aria-label={`Add ${NODE_KIND_LABELS[kind]} node`}
            className="cursor-grab rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {NODE_KIND_LABELS[kind]}
          </button>
        ))}
      </div>
    </Panel>
  );
}

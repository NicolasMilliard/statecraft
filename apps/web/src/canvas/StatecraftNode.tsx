import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { NodeKindIcon } from './NodeKindIcon';
import type { CanvasNode } from './to-react-flow-graph';

export const StatecraftNode = memo(function StatecraftNode({
  data,
  isConnectable,
}: NodeProps<CanvasNode>) {
  return (
    <>
      {data.isEntry && (
        <div className="statecraft-node__entry" aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v5a2 2 0 0 0 2 2h8 M10 7l3 3-3 3" />
          </svg>
          Entry point
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        title={`Connect to ${data.label}`}
      />

      <div className="statecraft-node__kind">
        <NodeKindIcon kind={data.kind} />
        <span>{NODE_KIND_LABELS[data.kind]}</span>
      </div>

      <div
        className={`statecraft-node__label${data.kind === 'service' ? ' font-mono' : ''}`}
      >
        {data.label}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        title={`Connect from ${data.label}`}
      />
    </>
  );
});

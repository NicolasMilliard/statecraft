import type { FlowNode } from '@statecraft/core';
import type { Ref } from 'react';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { Button } from '../ui/Button';
import { InspectorPanel } from './InspectorPanel';
import { NodeLabelEditor } from './NodeLabelEditor';

interface NodeInspectorProps {
  readonly labelInputRef?: Ref<HTMLInputElement>;
  readonly node: FlowNode | null;
  readonly isEntry: boolean;
  readonly onNodeRename: (nodeId: string, label: string) => void;
  readonly onEntryNodeChange: (nodeId: string | null) => void;
  readonly onNodeDelete: (nodeId: string) => void;
}

export function NodeInspector({
  labelInputRef = null,
  node,
  isEntry,
  onNodeRename,
  onEntryNodeChange,
  onNodeDelete,
}: NodeInspectorProps) {
  return (
    <InspectorPanel context={node === null ? 'No selection' : 'Node'}>
      {node === null ? (
        <div className="py-5">
          <h3 className="text-ui font-medium">Explore your flow</h3>
          <p className="mt-2 text-ui text-muted">
            Select a node or connection to inspect and edit its details.
          </p>
          <p className="mt-4 text-xs text-muted">
            Hold Shift and drag on the canvas to select several items.
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h3 className="text-sm font-medium wrap-anywhere">
              {node.label}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted wrap-anywhere">
              {node.id}
            </p>
          </div>

          <NodeLabelEditor ref={labelInputRef} key={node.id} node={node} onRename={onNodeRename} />

          <dl className="mt-6 space-y-5 text-ui">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Type</dt>
              <dd className="rounded border border-border bg-surface px-2 py-0.5 text-xs">
                {NODE_KIND_LABELS[node.kind]}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Entry point</dt>
              <dd>{isEntry ? 'Yes' : 'No'}</dd>
            </div>
          </dl>

          <Button
            variant="secondary"
            onClick={() => onEntryNodeChange(isEntry ? null : node.id)}
            className="mt-3 w-full"
          >
            {isEntry ? 'Clear entry point' : 'Set as entry point'}
          </Button>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 text-xs text-muted">
              Deleting this node also removes its connections.
            </p>

            <Button variant="danger" onClick={() => onNodeDelete(node.id)}>
              Delete node
            </Button>
          </div>
        </div>
      )}
    </InspectorPanel>
  );
}

import type { FlowNode } from '@statecraft/core';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { Button } from '../ui/Button';
import { NodeLabelEditor } from './NodeLabelEditor';

interface NodeInspectorProps {
  readonly node: FlowNode | null;
  readonly isEntry: boolean;
  readonly onNodeRename: (nodeId: string, label: string) => void;
  readonly onEntryNodeChange: (nodeId: string | null) => void;
  readonly onNodeDelete: (nodeId: string) => void;
}

export function NodeInspector({
  node,
  isEntry,
  onNodeRename,
  onEntryNodeChange,
  onNodeDelete,
}: NodeInspectorProps) {
  return (
    <aside
      className="max-h-64 min-h-0 overflow-y-auto border-t border-border bg-surface p-5 md:max-h-none md:border-t-0 md:border-l"
      aria-labelledby="node-inspector-title"
    >
      <h2
        id="node-inspector-title"
        className="text-ui font-semibold text-foreground"
      >
        Node details
      </h2>

      {node === null ? (
        <p className="mt-4 text-ui text-muted">
          Select a node or connection to inspect its details.
        </p>
      ) : (
        <div className="mt-5">
          <NodeLabelEditor key={node.id} node={node} onRename={onNodeRename} />

          <dl className="mt-5 space-y-4 text-ui">
            <div>
              <dt className="text-muted">Type</dt>
              <dd className="mt-1 font-medium">
                {NODE_KIND_LABELS[node.kind]}
              </dd>
            </div>

            <div>
              <dt className="text-muted">Entry point</dt>

              <dd className="mt-1">
                <p className="font-medium">{isEntry ? 'Yes' : 'No'}</p>

                <Button
                  variant="secondary"
                  onClick={() => onEntryNodeChange(isEntry ? null : node.id)}
                  className="mt-2"
                >
                  {isEntry ? 'Clear entry point' : 'Set as entry point'}
                </Button>
              </dd>
            </div>
          </dl>
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
    </aside>
  );
}

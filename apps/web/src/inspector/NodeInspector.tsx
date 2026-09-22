import type { FlowNode } from '@statecraft/core';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { NodeLabelEditor } from './NodeLabelEditor';

interface NodeInspectorProps {
  readonly node: FlowNode | null;
  readonly isEntry: boolean;
  readonly onNodeRename: (nodeId: string, label: string) => void;
  readonly onEntryNodeChange: (nodeId: string | null) => void;
}

export function NodeInspector({
  node,
  isEntry,
  onNodeRename,
  onEntryNodeChange,
}: NodeInspectorProps) {
  return (
    <aside
      className="max-h-64 min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-5 md:max-h-none md:border-t-0 md:border-l"
      aria-labelledby="node-inspector-title"
    >
      <h2
        id="node-inspector-title"
        className="text-sm font-semibold text-slate-700"
      >
        Node details
      </h2>

      {node === null ? (
        <p className="mt-4 text-sm text-slate-500">
          Select a node to inspect its details.
        </p>
      ) : (
        <div className="mt-5">
          <NodeLabelEditor key={node.id} node={node} onRename={onNodeRename} />

          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="mt-1 font-medium">
                {NODE_KIND_LABELS[node.kind]}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Entry point</dt>

              <dd className="mt-1">
                <p className="font-medium">{isEntry ? 'Yes' : 'No'}</p>

                <button
                  type="button"
                  onClick={() => onEntryNodeChange(isEntry ? null : node.id)}
                  className="mt-2 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {isEntry ? 'Clear entry point' : 'Set as entry point'}
                </button>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  );
}

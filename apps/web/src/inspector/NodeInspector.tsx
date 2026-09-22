import type { FlowNode, FlowNodeKind } from '@statecraft/core';

const NODE_KIND_LABELS: Record<FlowNodeKind, string> = {
  screen: 'Screen',
  ui: 'UI',
  action: 'Action',
  service: 'Service',
  state: 'State',
};

interface NodeInspectorProps {
  readonly node: FlowNode | null;
  readonly isEntry: boolean;
}

export function NodeInspector({ node, isEntry }: NodeInspectorProps) {
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
          <h3 className="text-lg font-semibold">{node.label}</h3>

          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="mt-1 font-medium">
                {NODE_KIND_LABELS[node.kind]}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Entry point</dt>
              <dd className="mt-1 font-medium">{isEntry ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  );
}

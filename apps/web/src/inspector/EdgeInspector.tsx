import {
  FLOW_EDGE_KINDS,
  type Flow,
  type FlowEdge,
  type FlowEdgeKind,
} from '@statecraft/core';
import { useId } from 'react';
import { canAddFlowEdge } from '../editor/can-add-flow-edge';

const EDGE_KIND_LABELS: Record<FlowEdgeKind, string> = {
  transition: 'Transition',
  success: 'Success',
  failure: 'Failure',
};

interface EdgeInspectorProps {
  readonly flow: Flow;
  readonly edge: FlowEdge;
  readonly onEdgeKindChange: (edgeId: string, kind: FlowEdgeKind) => void;
}

export function EdgeInspector({
  flow,
  edge,
  onEdgeKindChange,
}: EdgeInspectorProps) {
  const kindGroupId = useId();

  const sourceNode = flow.nodes.find((node) => node.id === edge.sourceNodeId);
  const targetNode = flow.nodes.find((node) => node.id === edge.targetNodeId);

  return (
    <aside
      className="max-h-64 min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-5 md:max-h-none md:border-t-0 md:border-l"
      aria-labelledby="edge-inspector-title"
    >
      <h2
        id="edge-inspector-title"
        className="text-sm font-semibold text-slate-700"
      >
        Connection details
      </h2>

      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="text-slate-500">From</dt>
          <dd className="mt-1 font-medium wrap-anywhere">
            {sourceNode?.label ?? edge.sourceNodeId}
          </dd>
        </div>

        <div>
          <dt className="text-slate-500">To</dt>
          <dd className="mt-1 font-medium wrap-anywhere">
            {targetNode?.label ?? edge.targetNodeId}
          </dd>
        </div>
      </dl>

      <fieldset className="mt-5" aria-describedby={`${kindGroupId}-hint`}>
        <legend className="text-sm text-slate-500">Type</legend>

        <div className="mt-2 space-y-2">
          {FLOW_EDGE_KINDS.map((kind) => {
            const isAvailable = canAddFlowEdge(
              flow,
              edge.sourceNodeId,
              edge.targetNodeId,
              kind,
              edge.id,
            );

            return (
              <label
                key={kind}
                className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <input
                  type="radio"
                  name={kindGroupId}
                  value={kind}
                  checked={edge.kind === kind}
                  disabled={!isAvailable}
                  onChange={() => onEdgeKindChange(edge.id, kind)}
                  className="accent-brand"
                />

                <span>
                  {EDGE_KIND_LABELS[kind]}
                  {!isAvailable && (
                    <span className="text-xs text-slate-500">
                      {' '}
                      (already exists)
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        <p id={`${kindGroupId}-hint`} className="mt-3 text-xs text-slate-500">
          Changes apply immediately. Unavailable types already connect these
          nodes in this direction.
        </p>
      </fieldset>
    </aside>
  );
}

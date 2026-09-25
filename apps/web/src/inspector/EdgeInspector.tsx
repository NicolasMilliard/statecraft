import {
  FLOW_EDGE_KINDS,
  type Flow,
  type FlowEdge,
  type FlowEdgeKind,
} from '@statecraft/core';
import { useId } from 'react';
import { canAddFlowEdge } from '../editor/can-add-flow-edge';
import { Button } from '../ui/Button';
import { InspectorPanel } from './InspectorPanel';

const EDGE_KIND_LABELS: Record<FlowEdgeKind, string> = {
  transition: 'Transition',
  success: 'Success',
  failure: 'Failure',
};

interface EdgeInspectorProps {
  readonly flow: Flow;
  readonly edge: FlowEdge;
  readonly onEdgeKindChange: (edgeId: string, kind: FlowEdgeKind) => void;
  readonly onEdgeDelete: (edgeId: string) => void;
}

export function EdgeInspector({
  flow,
  edge,
  onEdgeKindChange,
  onEdgeDelete,
}: EdgeInspectorProps) {
  const kindGroupId = useId();

  const sourceNode = flow.nodes.find((node) => node.id === edge.sourceNodeId);
  const targetNode = flow.nodes.find((node) => node.id === edge.targetNodeId);

  return (
    <InspectorPanel context="Connection">
      <div className="mb-6">
        <h3 className="text-sm font-medium">Connection details</h3>
        <p className="mt-1 font-mono text-xs text-muted wrap-anywhere">
          {edge.id}
        </p>
      </div>

      <dl className="space-y-4 rounded-control border border-border bg-surface p-3 text-ui">
        <div>
          <dt className="text-muted">From</dt>
          <dd className="mt-1 font-medium wrap-anywhere">
            {sourceNode?.label ?? edge.sourceNodeId}
          </dd>
        </div>

        <div>
          <dt className="text-muted">To</dt>
          <dd className="mt-1 font-medium wrap-anywhere">
            {targetNode?.label ?? edge.targetNodeId}
          </dd>
        </div>
      </dl>

      <fieldset className="mt-5" aria-describedby={`${kindGroupId}-hint`}>
        <legend className="text-ui text-muted">Type</legend>

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
                className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-ui"
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
                    <span className="text-xs text-muted">
                      {' '}
                      (already exists)
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        <p id={`${kindGroupId}-hint`} className="mt-3 text-xs text-muted">
          Changes apply immediately. Unavailable types already connect these
          nodes in this direction.
        </p>
      </fieldset>
      <div className="mt-6 border-t border-border pt-4">
        <Button variant="danger" onClick={() => onEdgeDelete(edge.id)}>
          Delete connection
        </Button>
      </div>
    </InspectorPanel>
  );
}

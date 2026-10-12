import type { CodeEntity, Flow, FlowImpactReason, SnapshotDocument, SyncSnapshot } from '@statecraft/core';
import { Button } from '../ui/Button';
import type { WorkspaceFlowImpactAnalysis } from './workspace-flow-impacts';

interface FlowImpactPreviewProps {
  readonly analysis: WorkspaceFlowImpactAnalysis;
  readonly before: SnapshotDocument;
  readonly after: SnapshotDocument;
}

function reasonKey(reason: FlowImpactReason): string {
  const changeId = reason.type === 'entity' ? reason.change.entityId : reason.change.relationId;
  return `${reason.referenceId}:${reason.type}:${changeId}`;
}

function reasonDescription(
  reason: FlowImpactReason,
  entities: ReadonlyMap<string, CodeEntity>,
): string {
  if (reason.type === 'entity') {
    const entity = entities.get(reason.change.entityId);
    return `${reason.change.kind} entity · ${entity?.name ?? reason.change.entityId}`;
  }

  const relation = reason.change.kind === 'removed' ? reason.change.before : reason.change.after;
  const source = entities.get(relation.sourceEntityId)?.name ?? relation.sourceEntityId;
  const target = entities.get(relation.targetEntityId)?.name ?? relation.targetEntityId;
  return `${reason.change.kind} ${relation.kind} relation · ${source} → ${target}`;
}

export function FlowImpactReasons({
  flow,
  reasons,
  before,
  after,
  onLocateNode,
}: {
  readonly flow: Flow;
  readonly reasons: readonly FlowImpactReason[];
  readonly before: SyncSnapshot;
  readonly after: SyncSnapshot;
  readonly onLocateNode?: (nodeId: string) => void;
}) {
  const entities = new Map<string, CodeEntity>();
  for (const entity of before.graph.entities) entities.set(entity.id, entity);
  for (const entity of after.graph.entities) entities.set(entity.id, entity);
  const byNode = new Map<string, FlowImpactReason[]>();
  for (const reason of reasons) {
    const group = byNode.get(reason.nodeId) ?? [];
    group.push(reason);
    byNode.set(reason.nodeId, group);
  }

  return (
    <ul className="mt-3 space-y-3">
      {[...byNode].map(([nodeId, nodeReasons]) => {
        const node = flow.nodes.find(({ id }) => id === nodeId);
        return (
          <li key={nodeId} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium wrap-anywhere">{node?.label ?? nodeId}</p>
              {onLocateNode && node && (
                <Button variant="secondary" className="text-xs" onClick={() => onLocateNode(nodeId)} aria-label={`View ${node.label} in ${flow.name}`}>
                  View node
                </Button>
              )}
            </div>
            <ul className="mt-2 space-y-2">
              {nodeReasons.map((reason) => {
                const reference = flow.codeReferences.find(({ id }) => id === reason.referenceId);
                return (
                  <li key={reasonKey(reason)}>
                    <p className="text-xs wrap-anywhere">{reasonDescription(reason, entities)}</p>
                    <p className="mt-1 text-xs text-muted wrap-anywhere">
                      {reference?.role ?? 'code'} link · {reference?.codeEntityId ?? reason.referenceId}
                    </p>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export function FlowImpactPreview({ analysis, before, after }: FlowImpactPreviewProps) {
  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Flow impact preview">
      <h4 className="text-ui font-medium">Flows touched by this comparison</h4>
      <p className="mt-2 text-xs text-muted">
        Preview only. Compare with does not set a review checkpoint or change review status.
      </p>
      {analysis.status === 'incompatible' ? (
        <p className="mt-3 text-ui text-danger">
          These snapshots cannot be compared ({analysis.reason.replaceAll('_', ' ')}).
        </p>
      ) : (
        <>
          <div className="mt-3 font-mono text-xs text-muted wrap-anywhere">
            <p>Baseline: {analysis.beforeSnapshotId}</p>
            <p>Current: {analysis.afterSnapshotId}</p>
          </div>
          <p className="mt-3 text-xs text-muted">
            {analysis.impacts.length} of {analysis.mappedFlowCount} mapped flows touched
          </p>
          {analysis.mappedFlowCount === 0 ? (
            <p className="mt-3 text-ui text-muted">No saved or active flow links code in this repository.</p>
          ) : analysis.impacts.length === 0 ? (
            <p className="mt-3 text-ui text-muted">No mapped flow has direct code changes in this comparison.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {analysis.impacts.map((impacted) => (
                <li key={impacted.flow.id} className="rounded-control border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h5 className="text-ui font-medium wrap-anywhere">{impacted.flow.name}</h5>
                    {impacted.isPreview && <span className="text-xs text-brand">Unsaved preview</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {impacted.isSaved ? 'Saved flow' : 'Active flow'} · {impacted.reasons.length} {impacted.reasons.length === 1 ? 'reason' : 'reasons'}
                  </p>
                  <FlowImpactReasons
                    flow={impacted.flow}
                    reasons={impacted.reasons}
                    before={before.snapshot}
                    after={after.snapshot}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

import {
  diffSnapshotEntities,
  diffSnapshotRelations,
  type CodeEntity,
  type SnapshotDocument,
} from '@statecraft/core';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { Select } from '../ui/Select';

interface SnapshotPanelProps {
  readonly documents: readonly SnapshotDocument[];
  readonly current: SnapshotDocument | null;
  readonly baseline: SnapshotDocument | null;
  readonly compatible: readonly SnapshotDocument[];
  readonly storageIssue: string | null;
  readonly onCurrentChange: (id: string) => void;
  readonly onBaselineChange: (id: string) => void;
}

function label(document: SnapshotDocument): string {
  const { snapshot } = document;
  return `${snapshot.graph.repositoryId} · ${snapshot.git.commitSha.slice(0, 8)}${snapshot.git.isDirty ? ' · dirty' : ''}`;
}

function entityLabel(entity: CodeEntity | undefined, entityId: string): string {
  return entity === undefined ? entityId : `${entity.kind} · ${entity.name}`;
}

function relationEntityLabel(
  entityId: string,
  current: ReadonlyMap<string, CodeEntity>,
  baseline: ReadonlyMap<string, CodeEntity>,
): string {
  return current.get(entityId)?.name ?? baseline.get(entityId)?.name ?? entityId;
}

export function SnapshotPanel({
  documents,
  current,
  baseline,
  compatible,
  storageIssue,
  onCurrentChange,
  onBaselineChange,
}: SnapshotPanelProps) {
  const entityDiff = current && baseline
    ? diffSnapshotEntities(baseline.snapshot, current.snapshot)
    : null;
  const relationDiff = current && baseline
    ? diffSnapshotRelations(baseline.snapshot, current.snapshot)
    : null;
  const entities = entityDiff?.status === 'compared' ? entityDiff.changes : [];
  const relations = relationDiff?.status === 'compared' ? relationDiff.changes : [];
  const currentEntities = new Map(current?.snapshot.graph.entities.map((entity) => [entity.id, entity] as const));
  const baselineEntities = new Map(baseline?.snapshot.graph.entities.map((entity) => [entity.id, entity] as const));

  return (
    <InspectorPanel title="Sync" context={`${documents.length} saved`}>
      {storageIssue && <p role="alert" className="text-ui text-danger">{storageIssue}</p>}
      {current === null ? (
        <div className="text-ui text-muted">
          <h3 className="font-medium text-foreground">No repository snapshot yet</h3>
          <p className="mt-2">Run the Statecraft CLI, then open its JSON file here to track code changes.</p>
        </div>
      ) : (
        <>
          <label htmlFor="current-snapshot" className="text-ui text-muted">Current snapshot</label>
          <Select
            id="current-snapshot"
            value={current.snapshot.id}
            onChange={(event) => onCurrentChange(event.target.value)}
            containerClassName="mt-2"
          >
            {documents.map((document) => (
              <option key={document.snapshot.id} value={document.snapshot.id}>{label(document)}</option>
            ))}
          </Select>
          <div className="mt-3 rounded-control border border-border bg-surface p-3 text-xs text-muted">
            <p className="font-mono wrap-anywhere">{current.snapshot.git.commitSha}</p>
            <p className="mt-1">{current.snapshot.git.isDirty ? 'Working tree had changes; this graph is not the exact commit state.' : 'Clean Git working tree'} · {current.snapshot.analysisProfileId}</p>
            <p className="mt-1">{current.snapshot.graph.entities.length} entities · {current.snapshot.graph.relations.length} relations · {current.diagnostics.length} diagnostics</p>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-ui font-medium">Compare with</h3>
            {compatible.length === 0 ? (
              <p className="mt-2 text-ui text-muted">Open another snapshot of this repository and analysis profile to see changes.</p>
            ) : (
              <>
                <Select
                  aria-label="Baseline snapshot"
                  value={baseline?.snapshot.id ?? ''}
                  onChange={(event) => onBaselineChange(event.target.value)}
                  containerClassName="mt-2"
                >
                  {compatible.map((document) => (
                    <option key={document.snapshot.id} value={document.snapshot.id}>{label(document)}</option>
                  ))}
                </Select>
                <p className="mt-3 text-xs text-muted">
                  {entities.length} entity changes · {relations.length} relation changes
                </p>
                {entities.length === 0 && relations.length === 0 && (
                  <p className="mt-3 text-ui text-muted">No structural changes detected.</p>
                )}
                {entities.length > 0 && (
                  <section className="mt-5" aria-label="Entity changes">
                    <h4 className="text-ui font-medium">Entities</h4>
                    <ul className="mt-2 space-y-2">
                      {entities.map((change) => {
                        const entity = change.kind === 'removed'
                          ? baselineEntities.get(change.entityId)
                          : currentEntities.get(change.entityId);
                        return (
                          <li key={change.entityId} className="rounded-control border border-border bg-surface p-3">
                            <p className="text-ui font-medium wrap-anywhere">{entityLabel(entity, change.entityId)}</p>
                            <p className="mt-1 text-xs text-muted wrap-anywhere">{change.kind} · {entity?.filePath ?? change.entityId}</p>
                            {change.kind === 'modified' && (
                              <p className="mt-1 font-mono text-xs text-muted wrap-anywhere">
                                {baselineEntities.get(change.entityId)?.structuralHash === currentEntities.get(change.entityId)?.structuralHash
                                  ? 'Metadata changed'
                                  : `${baselineEntities.get(change.entityId)?.structuralHash.slice(0, 8)} → ${currentEntities.get(change.entityId)?.structuralHash.slice(0, 8)}`}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
                {relations.length > 0 && (
                  <section className="mt-5" aria-label="Relation changes">
                    <h4 className="text-ui font-medium">Relations</h4>
                    <ul className="mt-2 space-y-2">
                      {relations.map((change) => {
                        const relation = change.kind === 'removed' ? change.before : change.after;
                        return (
                          <li key={change.relationId} className="rounded-control border border-border bg-surface p-3">
                            <p className="text-ui font-medium wrap-anywhere">{relation.kind}</p>
                            <p className="mt-1 text-xs text-muted wrap-anywhere">
                              {relationEntityLabel(relation.sourceEntityId, currentEntities, baselineEntities)} → {relationEntityLabel(relation.targetEntityId, currentEntities, baselineEntities)}
                            </p>
                            <p className="mt-1 text-xs text-muted">{change.kind}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
          {current.diagnostics.length > 0 && (
            <section className="mt-6 border-t border-border pt-5" aria-label="Scan diagnostics">
              <h3 className="text-ui font-medium">Diagnostics</h3>
              <ul className="mt-2 space-y-2">
                {current.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}:${diagnostic.filePath}:${index}`} className="text-xs text-muted wrap-anywhere">
                    {diagnostic.filePath ? `${diagnostic.filePath} · ` : ''}{diagnostic.message}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </InspectorPanel>
  );
}

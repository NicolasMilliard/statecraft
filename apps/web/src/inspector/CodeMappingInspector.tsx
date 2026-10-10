import {
  resolveCodeReference,
  type CodeReferenceRole,
  type Flow,
  type FlowNode,
  type SyncSnapshot,
} from '@statecraft/core';
import { useId, useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextInput } from '../ui/TextInput';

interface CodeMappingInspectorProps {
  readonly flow: Flow;
  readonly node: FlowNode;
  readonly snapshot: SyncSnapshot | null;
  readonly onAttach: (
    nodeId: string,
    entityId: string,
    role: CodeReferenceRole,
  ) => void;
  readonly onRoleChange: (referenceId: string, role: CodeReferenceRole) => void;
  readonly onDetach: (referenceId: string) => void;
}

const RESULT_LIMIT = 20;

export function CodeMappingInspector({
  flow,
  node,
  snapshot,
  onAttach,
  onRoleChange,
  onDetach,
}: CodeMappingInspectorProps) {
  const [query, setQuery] = useState('');
  const [newRole, setNewRole] = useState<CodeReferenceRole>('primary');
  const searchId = useId();
  const roleId = useId();
  const references = flow.codeReferences.filter(
    (reference) => reference.flowNodeId === node.id,
  );
  const graph = snapshot?.graph ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = graph?.entities.filter((entity) =>
    [entity.name, entity.kind, entity.filePath, entity.symbol ?? ''].some(
      (value) => value.toLocaleLowerCase().includes(normalizedQuery),
    ),
  ) ?? [];

  return (
    <section
      className="mt-6 border-t border-border pt-5"
      aria-labelledby={`${searchId}-heading`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 id={`${searchId}-heading`} className="text-sm font-medium">
          Code mapping
        </h4>
        <span className="text-xs text-muted">{references.length} linked</span>
      </div>

      {references.length > 0 && (
        <ul className="mt-3 space-y-2">
          {references.map((reference) => {
            const resolution = resolveCodeReference(reference, graph);
            const entity = resolution.status === 'resolved' ? resolution.entity : null;

            return (
              <li
                key={reference.id}
                className="rounded-control border border-border bg-surface p-3"
              >
                <p className="text-ui font-medium wrap-anywhere">
                  {entity?.name ?? reference.codeEntityId}
                </p>
                {entity !== null ? (
                  <p className="mt-1 font-mono text-xs text-muted wrap-anywhere">
                    {entity.kind} · {entity.filePath}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted wrap-anywhere">
                    {resolution.status === 'not_found'
                      ? 'Missing from this scan'
                      : `No scan loaded for ${reference.repositoryId}`}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Select
                    aria-label={`Role for ${entity?.name ?? reference.codeEntityId}`}
                    value={reference.role}
                    onChange={(event) =>
                      onRoleChange(reference.id, event.target.value as CodeReferenceRole)
                    }
                    containerClassName="flex-1"
                  >
                    <option value="primary">Primary</option>
                    <option value="dependency">Dependency</option>
                  </Select>
                  <Button
                    variant="secondary"
                    aria-label={`Unlink ${entity?.name ?? reference.codeEntityId}`}
                    onClick={() => onDetach(reference.id)}
                  >
                    Unlink
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {snapshot === null ? (
        <p className="mt-3 text-ui text-muted">
          Open a repository snapshot with Open JSON to find code to link to this node.
        </p>
      ) : (
        <div className="mt-5">
          <p className="mb-3 text-xs text-muted wrap-anywhere">
            Scan: {graph?.repositoryId}
          </p>
          <label htmlFor={searchId} className="text-ui text-muted">
            Find code entity
          </label>
          <TextInput
            id={searchId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, kind, or path"
            className="mt-2"
          />
          <label htmlFor={roleId} className="mt-3 block text-ui text-muted">
            Link as
          </label>
          <Select
            id={roleId}
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as CodeReferenceRole)}
            containerClassName="mt-2"
          >
            <option value="primary">Primary implementation</option>
            <option value="dependency">Dependency</option>
          </Select>
          <p className="mt-3 text-xs text-muted" role="status">
            {matches.length === 0
              ? 'No matching entities'
              : `Showing ${Math.min(matches.length, RESULT_LIMIT)} of ${matches.length} entities`}
          </p>
          <ul className="mt-2 space-y-2">
            {matches.slice(0, RESULT_LIMIT).map((entity) => {
              const linkedNodeIds = new Set(
                flow.codeReferences
                  .filter(
                    (reference) =>
                      reference.repositoryId === graph?.repositoryId &&
                      reference.codeEntityId === entity.id,
                  )
                  .map((reference) => reference.flowNodeId),
              );
              const linkedHere = linkedNodeIds.has(node.id);

              return (
                <li
                  key={entity.id}
                  className="rounded-control border border-border bg-surface p-3"
                >
                  <p className="text-ui font-medium wrap-anywhere">{entity.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted wrap-anywhere">
                    {entity.kind} · {entity.filePath}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {linkedHere
                        ? 'Linked here'
                        : linkedNodeIds.size > 0
                          ? `Linked to ${linkedNodeIds.size} node${linkedNodeIds.size === 1 ? '' : 's'}`
                          : 'Unmapped'}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={linkedHere}
                      onClick={() => onAttach(node.id, entity.id, newRole)}
                    >
                      {linkedHere ? 'Linked' : 'Link'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {matches.length > RESULT_LIMIT && (
            <p className="mt-2 text-xs text-muted">
              Refine the search to see more entities.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

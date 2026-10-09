import {
  resolveCodeReference,
  type CodeReferenceRole,
  type Flow,
  type FlowNode,
  type ScanReport,
} from '@statecraft/core';
import { useId, useState } from 'react';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';

interface CodeMappingInspectorProps {
  readonly flow: Flow;
  readonly node: FlowNode;
  readonly report: ScanReport | null;
  readonly onAttach: (
    nodeId: string,
    entityId: string,
    role: CodeReferenceRole,
  ) => void;
  readonly onRoleChange: (referenceId: string, role: CodeReferenceRole) => void;
  readonly onDetach: (referenceId: string) => void;
}

const RESULT_LIMIT = 20;

function SelectChevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 6 4.5 4.5L12.5 6" />
    </svg>
  );
}

export function CodeMappingInspector({
  flow,
  node,
  report,
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
  const graph = report?.graph ?? null;
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
                  <div className="relative min-w-0 flex-1">
                    <select
                      aria-label={`Role for ${entity?.name ?? reference.codeEntityId}`}
                      value={reference.role}
                      onChange={(event) =>
                        onRoleChange(reference.id, event.target.value as CodeReferenceRole)
                      }
                      className="min-h-9 w-full appearance-none rounded-control border border-border-strong bg-surface py-1.5 pl-2 pr-9 text-ui focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <option value="primary">Primary</option>
                      <option value="dependency">Dependency</option>
                    </select>
                    <SelectChevron />
                  </div>
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

      {report === null ? (
        <p className="mt-3 text-ui text-muted">
          Open a scan report with Open JSON to find code to link to this node.
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
          <div className="relative mt-2">
            <select
              id={roleId}
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as CodeReferenceRole)}
              className="min-h-9 w-full appearance-none rounded-control border border-border-strong bg-surface py-1.5 pl-3 pr-9 text-ui focus-visible:outline-2 focus-visible:outline-brand"
            >
              <option value="primary">Primary implementation</option>
              <option value="dependency">Dependency</option>
            </select>
            <SelectChevron />
          </div>
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

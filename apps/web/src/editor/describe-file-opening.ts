import type { SnapshotDocument } from '@statecraft/core';
import type { OpenDocument } from './open-document';

export function describeFileOpening(
  document: OpenDocument,
  currentFlowName: string,
  hasUnsavedChanges: boolean,
  currentSnapshot: SnapshotDocument | null,
) {
  if (document.kind === 'flow') {
    return {
      title: `Open flow “${document.editor.flow.name}”?`,
      detail: `This will replace the current flow “${currentFlowName}”.${hasUnsavedChanges ? ' Unsaved changes will be lost.' : ''}`,
      confirmLabel: 'Open flow',
    };
  }

  const { graph, git } = document.document.snapshot;
  const { diagnostics } = document.document;
  const entityCount = graph.entities.length;
  const diagnosticCount = diagnostics.length;
  const selection = currentSnapshot === null
    ? 'This will become the current snapshot.'
    : `This will become the current snapshot instead of “${currentSnapshot.snapshot.graph.repositoryId}”. Both snapshots will remain saved.`;

  return {
    title: `Save snapshot for “${graph.repositoryId}”?`,
    detail: `Commit ${git.commitSha.slice(0, 8)}${git.isDirty ? ' with working tree changes' : ''}. It contains ${entityCount} ${entityCount === 1 ? 'entity' : 'entities'} and ${diagnosticCount} ${diagnosticCount === 1 ? 'diagnostic' : 'diagnostics'}. ${selection} The current flow “${currentFlowName}” will stay open.`,
    confirmLabel: 'Save snapshot',
  };
}

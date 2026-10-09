import type { ScanReport } from '@statecraft/core';
import type { OpenDocument } from './open-document';

export function describeFileOpening(
  document: OpenDocument,
  currentFlowName: string,
  hasUnsavedChanges: boolean,
  currentReport: ScanReport | null,
) {
  if (document.kind === 'flow') {
    return {
      title: `Open flow “${document.editor.flow.name}”?`,
      detail: `This will replace the current flow “${currentFlowName}”.${hasUnsavedChanges ? ' Unsaved changes will be lost.' : ''}`,
      confirmLabel: 'Open flow',
    };
  }

  const { graph, diagnostics } = document.report;
  const entityCount = graph.entities.length;
  const diagnosticCount = diagnostics.length;
  const replacement = currentReport === null
    ? `The current flow “${currentFlowName}” will stay open.`
    : `This will replace the loaded report for “${currentReport.graph.repositoryId}”. The current flow “${currentFlowName}” will stay open.`;

  return {
    title: `Open scan report for “${graph.repositoryId}”?`,
    detail: `It contains ${entityCount} ${entityCount === 1 ? 'entity' : 'entities'} and ${diagnosticCount} ${diagnosticCount === 1 ? 'diagnostic' : 'diagnostics'}. ${replacement}`,
    confirmLabel: 'Open report',
  };
}

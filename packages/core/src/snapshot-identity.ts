import type { CodeGraph } from './code.js';
import type { ScanDiagnostic } from './scan-report.js';
import type { SnapshotGitState } from './snapshot.js';

/** Canonical input for the portable snapshot ID, excluding capture time. */
export function snapshotIdentityInput(
  graph: CodeGraph,
  analysisProfileId: string,
  git: SnapshotGitState,
  diagnostics: readonly ScanDiagnostic[],
): string {
  return JSON.stringify({
    repositoryId: graph.repositoryId,
    analysisProfileId,
    git,
    graph,
    diagnostics,
  });
}

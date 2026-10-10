import type { CodeGraph } from './code.js';
import type { ScanDiagnostic } from './scan-report.js';

export interface SnapshotGitState {
  readonly commitSha: string;
  readonly isDirty: boolean;
}

export interface SyncSnapshot {
  readonly id: string;
  readonly capturedAt: string;
  readonly git: SnapshotGitState;
  readonly analysisProfileId: string;
  readonly graph: CodeGraph;
}

/** Portable metadata produced by the CLI and stored by the web app. */
export interface SnapshotDocument {
  readonly formatVersion: 1;
  readonly snapshot: SyncSnapshot;
  readonly diagnostics: readonly ScanDiagnostic[];
}

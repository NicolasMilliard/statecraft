import type { CodeGraph } from './code.js';

export interface SnapshotGitState {
  readonly commitSha: string | null;
  readonly isDirty: boolean;
}

export interface SyncSnapshot {
  readonly id: string;
  readonly capturedAt: string;
  readonly git: SnapshotGitState;
  readonly analysisProfileId: string;
  readonly graph: CodeGraph;
}

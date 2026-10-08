import type { CodeGraph } from './code.js';

export interface ScanDiagnostic {
  readonly code: string;
  readonly filePath: string | null;
  readonly message: string;
}

export interface ScanReport {
  readonly formatVersion: 1;
  readonly analysisProfileId: 'react-ts-v1';
  readonly graph: CodeGraph;
  readonly diagnostics: readonly ScanDiagnostic[];
}

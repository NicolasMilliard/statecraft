import { snapshotIdentityInput, type ScanReport, type SnapshotDocument, type SnapshotGitState } from '@statecraft/core';
import { scanRepository, type ScanOptions } from '@statecraft/scanner';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { observeGit } from './git-state.js';

function snapshotId(report: ScanReport, gitState: SnapshotGitState): string {
  const identity = snapshotIdentityInput(
    report.graph, report.analysisProfileId, gitState, report.diagnostics,
  );
  return createHash('sha256').update(identity).digest('hex');
}

export function captureSnapshot(options: ScanOptions, outputPath?: string): SnapshotDocument {
  const repositoryPath = realpathSync(options.repositoryPath);
  const canonicalOutputPath = outputPath === undefined
    ? undefined
    : resolve(realpathSync(dirname(outputPath)), basename(outputPath));
  const before = observeGit(repositoryPath, canonicalOutputPath);
  const report = scanRepository({ ...options, repositoryPath });
  const after = observeGit(repositoryPath, canonicalOutputPath);

  if (before.state.commitSha !== after.state.commitSha || before.fingerprint !== after.fingerprint) {
    throw new Error('The repository changed during the scan. Run the scan again.');
  }

  return {
    formatVersion: 1,
    snapshot: {
      id: snapshotId(report, after.state),
      capturedAt: new Date().toISOString(),
      git: after.state,
      analysisProfileId: report.analysisProfileId,
      graph: report.graph,
    },
    diagnostics: report.diagnostics,
  };
}

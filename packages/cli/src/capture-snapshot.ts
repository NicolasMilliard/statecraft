import { snapshotIdentityInput, type ScanReport, type SnapshotDocument, type SnapshotGitState } from '@statecraft/core';
import { scanRepository, type ScanOptions } from '@statecraft/scanner';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';

interface GitObservation {
  readonly state: SnapshotGitState;
  readonly status: string;
}

function git(repositoryPath: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error('A Git working tree with a HEAD commit is required to capture a snapshot.');
  }
  return result.stdout.trimEnd();
}

function observeGit(repositoryPath: string, outputPath?: string): GitObservation {
  const commitSha = git(repositoryPath, ['rev-parse', '--verify', 'HEAD']);
  if (!/^[a-f0-9]{40,64}$/.test(commitSha)) {
    throw new Error('Git returned an invalid HEAD commit SHA.');
  }
  const gitRoot = git(repositoryPath, ['rev-parse', '--show-toplevel']);
  const outputRelative = outputPath === undefined ? null : relative(gitRoot, outputPath);
  const excludedOutput = outputRelative !== null &&
    outputRelative !== '' &&
    !outputRelative.startsWith('..') &&
    !isAbsolute(outputRelative)
    ? [`:(exclude,top)${outputRelative.split('\\').join('/')}`]
    : [];
  const status = git(repositoryPath, [
    'status', '--porcelain=v1', '--untracked-files=all', '--', '.', ...excludedOutput,
  ]);
  return {
    state: { commitSha, isDirty: status.length > 0 },
    status,
  };
}

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

  if (before.state.commitSha !== after.state.commitSha || before.status !== after.status) {
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

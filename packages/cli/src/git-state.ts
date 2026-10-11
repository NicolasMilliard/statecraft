import type { SnapshotGitState } from '@statecraft/core';
import { createHash, type Hash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  lstatSync,
  openSync,
  readlinkSync,
  readSync,
  type Stats,
} from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

export interface GitObservation {
  readonly state: SnapshotGitState;
  readonly fingerprint: string;
}

function git(repositoryPath: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error('A Git working tree with a HEAD commit is required to capture a snapshot.');
  }
  return result.stdout;
}

function hashWorkingFile(hash: Hash, repositoryPath: string, path: string): void {
  const absolutePath = resolve(repositoryPath, path);
  hash.update(path).update('\0');
  let stats: Stats;
  try {
    stats = lstatSync(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    hash.update('missing').update('\0');
    return;
  }

  if (stats.isSymbolicLink()) {
    hash.update('symlink').update(readlinkSync(absolutePath));
  } else if (stats.isFile()) {
    hash.update('file');
    const file = openSync(absolutePath, 'r');
    try {
      const buffer = Buffer.allocUnsafe(64 * 1024);
      let bytesRead: number;
      while ((bytesRead = readSync(file, buffer, 0, buffer.length, null)) > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } finally {
      closeSync(file);
    }
  } else {
    hash.update('other');
  }
  hash.update('\0');
}

/** Observe the selected subtree without counting the CLI's own output file. */
export function observeGit(repositoryPath: string, outputPath?: string): GitObservation {
  const commitSha = git(repositoryPath, ['rev-parse', '--verify', 'HEAD']).trim();
  if (!/^[a-f0-9]{40,64}$/.test(commitSha)) {
    throw new Error('Git returned an invalid HEAD commit SHA.');
  }

  const gitRoot = git(repositoryPath, ['rev-parse', '--show-toplevel']).trimEnd();
  const outputRelative = outputPath === undefined ? null : relative(gitRoot, outputPath);
  const excludedOutput = outputRelative !== null &&
    outputRelative !== '' &&
    !outputRelative.startsWith('..') &&
    !isAbsolute(outputRelative)
    ? [`:(exclude,top)${outputRelative.split('\\').join('/')}`]
    : [];
  const paths = ['--', '.', ...excludedOutput];
  const status = git(repositoryPath, [
    'status', '--porcelain=v1', '--untracked-files=all', ...paths,
  ]);

  // Porcelain status only records *which* dirty paths exist. Include staged
  // object IDs and working file contents to detect edits during the scan.
  const stagedDiff = git(repositoryPath, [
    'diff', '--cached', '--raw', '-z', '--no-ext-diff', '--no-color', 'HEAD', ...paths,
  ]);
  const modified = git(repositoryPath, [
    'ls-files', '--modified', '-z', ...paths,
  ]).split('\0').filter(Boolean);
  const untracked = git(repositoryPath, [
    'ls-files', '--others', '--exclude-standard', '-z', ...paths,
  ]).split('\0').filter(Boolean);
  const hash = createHash('sha256');
  hash.update(status).update('\0').update(stagedDiff).update('\0');
  for (const path of [...new Set([...modified, ...untracked])].sort()) {
    hashWorkingFile(hash, repositoryPath, path);
  }

  return {
    state: { commitSha, isDirty: status.length > 0 },
    fingerprint: hash.digest('hex'),
  };
}

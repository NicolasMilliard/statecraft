import { validateCodeGraph, type ScanDiagnostic, type ScanReport } from '@statecraft/core';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { API } from 'typescript/unstable/sync';
import { buildGraph } from './graph-builder.js';

export interface ScanOptions {
  readonly repositoryPath: string;
  readonly repositoryId: string;
  readonly tsconfigPath?: string;
}

export type { ScanDiagnostic, ScanReport } from '@statecraft/core';

/**
 * React/TypeScript profile: finds named JSX components, direct TanStack file routes,
 * reachable local hooks/functions, direct TanStack Query calls, and static
 * fetch/Axios requests.
 */
export function scanRepository(options: ScanOptions): ScanReport {
  const repositoryId = options.repositoryId.trim();
  if (repositoryId.length === 0) {
    throw new Error('Repository ID must not be empty.');
  }

  const repositoryRoot = realpathSync(options.repositoryPath);
  if (!statSync(repositoryRoot).isDirectory()) {
    throw new Error('Repository path must be a directory.');
  }

  const configPath = resolve(
    repositoryRoot,
    options.tsconfigPath ?? 'tsconfig.json',
  );
  if (!isWithin(repositoryRoot, configPath) || !existsSync(configPath)) {
    throw new Error('A tsconfig inside the repository is required.');
  }

  const api = new API({ cwd: repositoryRoot });
  try {
    const snapshot = api.updateSnapshot({ openProjects: [configPath] });
    try {
      const project = snapshot.getProject(configPath);
      if (project === undefined) {
        throw new Error('Could not load the selected TypeScript project.');
      }

      const configDiagnostics =
        project.program.getConfigFileParsingDiagnostics();
      const syntaxDiagnostics = project.program.getSyntacticDiagnostics();
      if (configDiagnostics.length > 0 || syntaxDiagnostics.length > 0) {
        throw new Error(
          'The TypeScript project has configuration or syntax errors.',
        );
      }

      const diagnostics: ScanDiagnostic[] = [];
      const graph = buildGraph(project, repositoryRoot, repositoryId, diagnostics);
      const issues = validateCodeGraph(graph);
      if (issues.length > 0) {
        throw new Error(
          'Scanner produced an invalid code graph: ' + JSON.stringify(issues),
        );
      }

      return {
        formatVersion: 1,
        analysisProfileId: 'react-ts-v2',
        graph,
        diagnostics,
      };
    } finally {
      snapshot.dispose();
    }
  } finally {
    api.close();
  }
}

function isWithin(repositoryRoot: string, fileName: string): boolean {
  const path = relative(repositoryRoot, fileName);
  return path !== '..' && !path.startsWith('..' + sep) && !path.startsWith(sep);
}

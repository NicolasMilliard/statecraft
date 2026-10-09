#!/usr/bin/env node
import { scanRepository } from '@statecraft/scanner';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const usage = 'Usage: statecraft scan <repository-path> --repository-id <id> [--tsconfig <path>] [--output <path|->]';

function main(args: readonly string[]): number {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    process.stdout.write(usage + '\n');
    return args.length === 0 ? 2 : 0;
  }
  if (args[0] !== 'scan') {
    throw new Error('Unknown command. ' + usage);
  }

  let repositoryPath: string | undefined;
  let repositoryId: string | undefined;
  let tsconfigPath: string | undefined;
  let outputPath = '-';

  for (let index = 1; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--repository-id' ||
        argument === '--tsconfig' ||
        argument === '--output') {
      const value = args[++index];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for ' + argument + '.');
      }
      if (argument === '--repository-id') repositoryId = value;
      if (argument === '--tsconfig') tsconfigPath = value;
      if (argument === '--output') outputPath = value;
    } else if (argument?.startsWith('-')) {
      throw new Error('Unknown option: ' + argument + '.');
    } else if (repositoryPath === undefined) {
      repositoryPath = argument;
    } else {
      throw new Error('Only one repository path can be scanned.');
    }
  }

  if (!repositoryPath || !repositoryId) {
    throw new Error('Repository path and --repository-id are required. ' + usage);
  }

  const report = scanRepository({
    repositoryPath: resolve(repositoryPath),
    repositoryId,
    ...(tsconfigPath === undefined ? {} : { tsconfigPath }),
  });
  const json = JSON.stringify(report, null, 2) + '\n';

  if (outputPath === '-') {
    process.stdout.write(json);
  } else {
    const reportPath = resolve(outputPath);
    writeFileSync(reportPath, json, 'utf8');
    process.stderr.write(
      `Scan report saved to ${reportPath}\n` +
      'Open it in Statecraft with Open JSON or drag it onto the app.\n',
    );
  }
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(
    'statecraft: ' + (error instanceof Error ? error.message : String(error)) + '\n',
  );
  process.exitCode = 1;
}

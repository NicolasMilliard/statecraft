import {
  CODE_ENTITY_KINDS,
  CODE_RELATION_KINDS,
  validateCodeGraph,
  type ScanReport,
} from '@statecraft/core';
import { z } from 'zod';
import type { FlowEditorState } from './flow-editor-state';
import { parseFlowDocument } from './flow-document.ts';

const nonEmptyString = z.string().min(1);

const scanReportSchema: z.ZodType<ScanReport> = z
  .strictObject({
    formatVersion: z.literal(1),
    analysisProfileId: z.literal('react-ts-v1'),
    graph: z.strictObject({
      repositoryId: nonEmptyString,
      entities: z.array(
        z.strictObject({
          id: nonEmptyString,
          kind: z.enum(CODE_ENTITY_KINDS),
          name: nonEmptyString,
          filePath: nonEmptyString,
          symbol: z.string().nullable(),
          structuralHash: z.string().regex(/^[a-f0-9]{64}$/),
        }),
      ),
      relations: z.array(
        z.strictObject({
          id: nonEmptyString,
          kind: z.enum(CODE_RELATION_KINDS),
          sourceEntityId: nonEmptyString,
          targetEntityId: nonEmptyString,
        }),
      ),
    }),
    diagnostics: z.array(
      z.strictObject({
        code: nonEmptyString,
        filePath: z.string().nullable(),
        message: nonEmptyString,
      }),
    ),
  })
  .refine((report) => validateCodeGraph(report.graph).length === 0, {
    message: 'Invalid code graph.',
    path: ['graph'],
  });

export type OpenDocument =
  | { readonly kind: 'flow'; readonly editor: FlowEditorState }
  | { readonly kind: 'scan-report'; readonly report: ScanReport };

export function parseOpenDocument(serialized: string): OpenDocument {
  const value: unknown = JSON.parse(serialized);

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Unsupported JSON document.');
  }

  const hasFlowVersion = Object.hasOwn(value, 'version');
  const hasScanVersion = Object.hasOwn(value, 'formatVersion');

  if (hasFlowVersion === hasScanVersion) {
    throw new Error('Unsupported JSON document.');
  }

  return hasFlowVersion
    ? { kind: 'flow', editor: parseFlowDocument(serialized) }
    : { kind: 'scan-report', report: scanReportSchema.parse(value) };
}

import {
  CODE_ENTITY_KINDS,
  CODE_RELATION_KINDS,
  validateCodeGraph,
} from "@statecraft/core";
import type { SnapshotDocument } from "@statecraft/core";
import { z } from "zod";

import { parseFlowDocument } from "./flow-document.ts";
import type { FlowEditorState } from "./flow-editor-state";

const nonEmptyString = z.string().min(1);

const graphSchema = z
  .strictObject({
    repositoryId: nonEmptyString,
    entities: z.array(
      z.strictObject({
        id: nonEmptyString,
        kind: z.enum(CODE_ENTITY_KINDS),
        name: nonEmptyString,
        filePath: nonEmptyString,
        symbol: z.string().nullable(),
        structuralHash: z.string().regex(/^[a-f0-9]{64}$/u),
      })
    ),
    relations: z.array(
      z.strictObject({
        id: nonEmptyString,
        kind: z.enum(CODE_RELATION_KINDS),
        sourceEntityId: nonEmptyString,
        targetEntityId: nonEmptyString,
      })
    ),
  })
  .refine((graph) => validateCodeGraph(graph).length === 0, {
    message: "Invalid code graph.",
  });

const snapshotDocumentSchema: z.ZodType<SnapshotDocument> = z.strictObject({
  formatVersion: z.literal(1),
  snapshot: z.strictObject({
    id: z.string().regex(/^[a-f0-9]{64}$/u),
    capturedAt: z.iso.datetime({ offset: true }),
    git: z.strictObject({
      commitSha: z.string().regex(/^[a-f0-9]{40,64}$/u),
      isDirty: z.boolean(),
    }),
    analysisProfileId: nonEmptyString,
    graph: graphSchema,
  }),
  diagnostics: z.array(
    z.strictObject({
      code: nonEmptyString,
      filePath: z.string().nullable(),
      message: nonEmptyString,
    })
  ),
});

export type OpenDocument =
  | { readonly kind: "flow"; readonly editor: FlowEditorState }
  | { readonly kind: "snapshot"; readonly document: SnapshotDocument };

export function parseSnapshotDocument(value: unknown): SnapshotDocument {
  return snapshotDocumentSchema.parse(value);
}

export function parseOpenDocument(serialized: string): OpenDocument {
  const value: unknown = JSON.parse(serialized);

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Unsupported JSON document.");
  }

  const hasFlowVersion = Object.hasOwn(value, "version");
  const hasSnapshotVersion = Object.hasOwn(value, "formatVersion");

  if (hasFlowVersion === hasSnapshotVersion) {
    throw new Error("Unsupported JSON document.");
  }

  return hasFlowVersion
    ? { kind: "flow", editor: parseFlowDocument(serialized) }
    : { kind: "snapshot", document: parseSnapshotDocument(value) };
}

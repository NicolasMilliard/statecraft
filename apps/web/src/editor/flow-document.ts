import {
  FLOW_EDGE_KINDS,
  FLOW_NODE_KINDS,
  validateFlow,
  type Flow,
} from '@statecraft/core';
import { z } from 'zod';
import type { FlowLayout } from '../canvas/flow-layout';
import type { FlowEditorState } from './flow-editor-state';

const nonEmptyString = z.string().min(1);

const flowSchema: z.ZodType<Flow> = z
  .strictObject({
    id: nonEmptyString,
    name: nonEmptyString,
    entryNodeId: nonEmptyString.nullable(),
    nodes: z.array(
      z.strictObject({
        id: nonEmptyString,
        kind: z.enum(FLOW_NODE_KINDS),
        label: nonEmptyString,
      }),
    ),
    edges: z.array(
      z.strictObject({
        id: nonEmptyString,
        sourceNodeId: nonEmptyString,
        targetNodeId: nonEmptyString,
        kind: z.enum(FLOW_EDGE_KINDS),
      }),
    ),
    codeReferences: z.array(
      z.strictObject({
        id: nonEmptyString,
        flowNodeId: nonEmptyString,
        repositoryId: nonEmptyString,
        codeEntityId: nonEmptyString,
        role: z.enum(['primary', 'dependency']),
      }),
    ),
  })
  .refine((flow) => validateFlow(flow).length === 0, {
    message: 'Invalid flow references.',
  });

const layoutSchema: z.ZodType<FlowLayout> = z.strictObject({
  flowId: nonEmptyString,
  positions: z.record(
    nonEmptyString,
    z.strictObject({
      x: z.number(),
      y: z.number(),
    }),
  ),
});

const editorSchema: z.ZodType<FlowEditorState> = z
  .strictObject({
    flow: flowSchema,
    layout: layoutSchema,
    initialLayout: layoutSchema,
  })
  .refine(
    ({ flow, layout, initialLayout }) =>
      [layout, initialLayout].every(
        (candidate) =>
          candidate.flowId === flow.id &&
          Object.keys(candidate.positions).length === flow.nodes.length &&
          flow.nodes.every((node) =>
            Object.hasOwn(candidate.positions, node.id),
          ),
      ),
    {
      message: 'Layouts must contain exactly the flow nodes.',
    },
  );

const documentSchema = z.strictObject({
  version: z.literal(1),
  editor: editorSchema,
});

export function serializeFlowDocument(editor: FlowEditorState): string {
  const document = documentSchema.parse({
    version: 1,
    editor,
  });

  return JSON.stringify(document);
}

export function parseFlowDocument(serialized: string): FlowEditorState {
  const value: unknown = JSON.parse(serialized);

  return documentSchema.parse(value).editor;
}

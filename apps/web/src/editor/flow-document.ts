import {
  FLOW_EDGE_KINDS,
  FLOW_NODE_KINDS,
  SERVICE_OUTCOME_KINDS,
  validateFlow,
  validateScenario,
  type Flow,
  type Scenario,
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

const scenarioSchema: z.ZodType<Scenario> = z.strictObject({
  id: nonEmptyString,
  flowId: nonEmptyString,
  name: z.string().refine((name) => name.trim().length > 0),
  overrides: z.array(
    z.strictObject({
      flowNodeId: nonEmptyString,
      outcome: z.strictObject({
        kind: z.enum(SERVICE_OUTCOME_KINDS),
        code: z.string().refine((code) => code.trim().length > 0).nullable(),
        httpStatus: z.number().int().min(100).max(599).nullable(),
      }),
    }),
  ),
});

const editorFields = {
  flow: flowSchema,
  layout: layoutSchema,
  initialLayout: layoutSchema,
};

function layoutsMatchFlow(editor: {
  flow: Flow;
  layout: FlowLayout;
  initialLayout: FlowLayout;
}): boolean {
  const { flow, layout, initialLayout } = editor;
  return [layout, initialLayout].every(
    (candidate) =>
      candidate.flowId === flow.id &&
      Object.keys(candidate.positions).length === flow.nodes.length &&
      flow.nodes.every((node) => Object.hasOwn(candidate.positions, node.id)),
  );
}

const editorV1Schema = z.strictObject(editorFields).refine(layoutsMatchFlow, {
  message: 'Layouts must contain exactly the flow nodes.',
});

const editorV2Schema: z.ZodType<FlowEditorState> = z
  .strictObject({ ...editorFields, scenarios: z.array(scenarioSchema) })
  .refine(layoutsMatchFlow, {
    message: 'Layouts must contain exactly the flow nodes.',
  })
  .refine(
    ({ scenarios }) =>
      new Set(scenarios.map((scenario) => scenario.id)).size ===
      scenarios.length,
    { message: 'Scenario IDs must be unique.', path: ['scenarios'] },
  )
  .refine(
    ({ flow, scenarios }) =>
      scenarios.every((scenario) => validateScenario(scenario, flow).length === 0),
    { message: 'Invalid scenario references.', path: ['scenarios'] },
  );

const documentV1Schema = z.strictObject({
  version: z.literal(1),
  editor: editorV1Schema,
});

const documentV2Schema = z.strictObject({
  version: z.literal(2),
  editor: editorV2Schema,
});

export function serializeFlowDocument(editor: FlowEditorState): string {
  const document = documentV2Schema.parse({
    version: 2,
    editor,
  });

  return JSON.stringify(document);
}

export function parseFlowDocument(
  serialized: string,
  expectedFlowId?: string,
): FlowEditorState {
  const value: unknown = JSON.parse(serialized);
  const document = z.union([documentV1Schema, documentV2Schema]).parse(value);
  const editor: FlowEditorState = document.version === 1
    ? { ...document.editor, scenarios: [] }
    : document.editor;

  if (expectedFlowId !== undefined && editor.flow.id !== expectedFlowId) {
    throw new Error('Document belongs to another flow.');
  }

  return editor;
}

import type { Scenario, ServiceOutcome } from '@statecraft/core';
import type { FlowEditorState } from './flow-editor-state';

function updateScenario(
  editor: FlowEditorState,
  scenarioId: string,
  update: (scenario: Scenario) => Scenario,
): FlowEditorState {
  const scenarios = editor.scenarios.map((scenario) =>
    scenario.id === scenarioId ? update(scenario) : scenario,
  );

  return scenarios.every((scenario, index) => scenario === editor.scenarios[index])
    ? editor
    : { ...editor, scenarios };
}

export function addScenario(
  editor: FlowEditorState,
  scenarioId: string,
  name = 'New scenario',
): FlowEditorState {
  const normalizedName = name.trim();
  if (
    scenarioId.length === 0 ||
    normalizedName.length === 0 ||
    editor.scenarios.some((scenario) => scenario.id === scenarioId)
  ) {
    return editor;
  }

  return {
    ...editor,
    scenarios: [
      ...editor.scenarios,
      { id: scenarioId, flowId: editor.flow.id, name: normalizedName, overrides: [] },
    ],
  };
}

export function duplicateScenario(
  editor: FlowEditorState,
  sourceScenarioId: string,
  newScenarioId: string,
): FlowEditorState {
  const source = editor.scenarios.find((scenario) => scenario.id === sourceScenarioId);
  if (
    source === undefined ||
    newScenarioId.length === 0 ||
    editor.scenarios.some((scenario) => scenario.id === newScenarioId)
  ) {
    return editor;
  }

  return {
    ...editor,
    scenarios: [
      ...editor.scenarios,
      {
        ...source,
        id: newScenarioId,
        name: `${source.name} copy`,
        overrides: source.overrides.map((override) => ({
          ...override,
          outcome: { ...override.outcome },
        })),
      },
    ],
  };
}

export function renameScenario(
  editor: FlowEditorState,
  scenarioId: string,
  name: string,
): FlowEditorState {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) return editor;

  return updateScenario(editor, scenarioId, (scenario) =>
    scenario.name === normalizedName
      ? scenario
      : { ...scenario, name: normalizedName },
  );
}

export function removeScenario(
  editor: FlowEditorState,
  scenarioId: string,
): FlowEditorState {
  const scenarios = editor.scenarios.filter((scenario) => scenario.id !== scenarioId);
  return scenarios.length === editor.scenarios.length
    ? editor
    : { ...editor, scenarios };
}

export function setScenarioOverride(
  editor: FlowEditorState,
  scenarioId: string,
  flowNodeId: string,
  outcome: ServiceOutcome | null,
): FlowEditorState {
  if (!editor.flow.nodes.some((node) => node.id === flowNodeId && node.kind === 'service')) {
    return editor;
  }

  if (
    outcome !== null &&
    (
      !['success', 'failure'].includes(outcome.kind) ||
      (outcome.httpStatus !== null &&
        (!Number.isInteger(outcome.httpStatus) ||
          outcome.httpStatus < 100 ||
          outcome.httpStatus > 599))
    )
  ) {
    return editor;
  }

  const normalizedOutcome: ServiceOutcome | null = outcome === null
    ? null
    : { ...outcome, code: outcome.code?.trim() || null };

  return updateScenario(editor, scenarioId, (scenario) => {
    const previous = scenario.overrides.find(
      (override) => override.flowNodeId === flowNodeId,
    );

    if (normalizedOutcome === null) {
      return previous === undefined
        ? scenario
        : {
            ...scenario,
            overrides: scenario.overrides.filter(
              (override) => override.flowNodeId !== flowNodeId,
            ),
          };
    }

    if (
      previous?.outcome.kind === normalizedOutcome.kind &&
      previous.outcome.code === normalizedOutcome.code &&
      previous.outcome.httpStatus === normalizedOutcome.httpStatus
    ) {
      return scenario;
    }

    const override = { flowNodeId, outcome: normalizedOutcome };
    return {
      ...scenario,
      overrides: previous === undefined
        ? [...scenario.overrides, override]
        : scenario.overrides.map((item) =>
            item.flowNodeId === flowNodeId ? override : item,
          ),
    };
  });
}

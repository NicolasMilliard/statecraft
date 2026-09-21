import type { Flow } from './flow.js';
import type { Scenario } from './scenario.js';

export type ScenarioValidationIssue =
  | {
      readonly code: 'scenario_flow_mismatch';
      readonly expectedFlowId: string;
      readonly actualFlowId: string;
    }
  | {
      readonly code:
        | 'duplicate_override'
        | 'override_node_not_found'
        | 'override_node_not_service';
      readonly nodeId: string;
      readonly overrideIndex: number;
    };

/**
 * Validates scenario references against an already validated flow.
 */
export function validateScenario(
  scenario: Scenario,
  flow: Flow,
): readonly ScenarioValidationIssue[] {
  if (scenario.flowId !== flow.id) {
    return [
      {
        code: 'scenario_flow_mismatch',
        expectedFlowId: flow.id,
        actualFlowId: scenario.flowId,
      },
    ];
  }

  const issues: ScenarioValidationIssue[] = [];

  const nodesById = new Map(flow.nodes.map((node) => [node.id, node] as const));

  const overriddenNodeIds = new Set<string>();

  for (const [overrideIndex, override] of scenario.overrides.entries()) {
    const nodeId = override.flowNodeId;

    if (overriddenNodeIds.has(nodeId)) {
      issues.push({
        code: 'duplicate_override',
        nodeId,
        overrideIndex,
      });
    }

    overriddenNodeIds.add(nodeId);

    const node = nodesById.get(nodeId);

    if (node === undefined) {
      issues.push({
        code: 'override_node_not_found',
        nodeId,
        overrideIndex,
      });
    } else if (node.kind !== 'service') {
      issues.push({
        code: 'override_node_not_service',
        nodeId,
        overrideIndex,
      });
    }
  }

  return issues;
}

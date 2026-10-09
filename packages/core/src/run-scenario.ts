import type { Flow, FlowEdge, FlowEdgeKind } from './flow.js';
import {
  DEFAULT_SERVICE_OUTCOME,
  type Scenario,
  type ServiceOutcome,
} from './scenario.js';
import { validateFlow, type FlowValidationIssue } from './validate-flow.js';
import {
  validateScenario,
  type ScenarioValidationIssue,
} from './validate-scenario.js';

export interface ScenarioRunServiceOutcome {
  readonly flowNodeId: string;
  readonly outcome: ServiceOutcome;
  readonly source: 'default' | 'override';
}

export interface ScenarioRunTrace {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
  readonly serviceOutcomes: readonly ScenarioRunServiceOutcome[];
}

export type ScenarioRunStopReason =
  | { readonly code: 'invalid_flow'; readonly issues: readonly FlowValidationIssue[] }
  | { readonly code: 'invalid_scenario'; readonly issues: readonly ScenarioValidationIssue[] }
  | { readonly code: 'missing_entry' }
  | {
      readonly code: 'missing_branch' | 'ambiguous_branch';
      readonly nodeId: string;
      readonly expectedEdgeKind: FlowEdgeKind;
    }
  | { readonly code: 'cycle'; readonly nodeId: string };

export type ScenarioRunResult =
  | {
      readonly status: 'completed';
      readonly trace: ScenarioRunTrace;
      readonly terminalNodeId: string;
    }
  | {
      readonly status: 'stopped';
      readonly trace: ScenarioRunTrace;
      readonly reason: ScenarioRunStopReason;
    };

/** Computes one simulated path through the functional Flow model. */
export function runScenario(flow: Flow, scenario: Scenario): ScenarioRunResult {
  const trace: {
    nodeIds: string[];
    edgeIds: string[];
    serviceOutcomes: ScenarioRunServiceOutcome[];
  } = { nodeIds: [], edgeIds: [], serviceOutcomes: [] };

  const flowIssues = validateFlow(flow);
  if (flowIssues.length > 0) {
    return { status: 'stopped', trace, reason: { code: 'invalid_flow', issues: flowIssues } };
  }

  const scenarioIssues = validateScenario(scenario, flow);
  if (scenarioIssues.length > 0) {
    return {
      status: 'stopped',
      trace,
      reason: { code: 'invalid_scenario', issues: scenarioIssues },
    };
  }

  const entryNodeId = flow.entryNodeId;
  if (entryNodeId === null) {
    return { status: 'stopped', trace, reason: { code: 'missing_entry' } };
  }

  const nodesById = new Map(flow.nodes.map((node) => [node.id, node] as const));
  const outgoingBySource = new Map<string, FlowEdge[]>();
  for (const edge of flow.edges) {
    const outgoing = outgoingBySource.get(edge.sourceNodeId) ?? [];
    outgoing.push(edge);
    outgoingBySource.set(edge.sourceNodeId, outgoing);
  }

  const overridesByNode = new Map(
    scenario.overrides.map((override) => [override.flowNodeId, override] as const),
  );

  let currentNodeId = entryNodeId;
  const visited = new Set([entryNodeId]);
  trace.nodeIds.push(entryNodeId);

  while (true) {
    const currentNode = nodesById.get(currentNodeId);
    // validateFlow guarantees that the entry and every edge target exist.
    if (currentNode === undefined) {
      throw new Error(`Validated Flow has no node "${currentNodeId}".`);
    }

    let expectedEdgeKind: FlowEdgeKind = 'transition';
    if (currentNode.kind === 'service') {
      const override = overridesByNode.get(currentNodeId);
      const outcome = { ...(override?.outcome ?? DEFAULT_SERVICE_OUTCOME) };
      expectedEdgeKind = outcome.kind;
      trace.serviceOutcomes.push({
        flowNodeId: currentNodeId,
        outcome,
        source: override === undefined ? 'default' : 'override',
      });
    }

    const outgoing = outgoingBySource.get(currentNodeId) ?? [];
    if (outgoing.length === 0) {
      return { status: 'completed', trace, terminalNodeId: currentNodeId };
    }

    const matching = outgoing.filter((edge) => edge.kind === expectedEdgeKind);
    if (matching.length !== 1) {
      return {
        status: 'stopped',
        trace,
        reason: {
          code: matching.length === 0 ? 'missing_branch' : 'ambiguous_branch',
          nodeId: currentNodeId,
          expectedEdgeKind,
        },
      };
    }

    const edge = matching[0];
    if (edge === undefined) {
      throw new Error('A single matching edge was expected.');
    }

    trace.edgeIds.push(edge.id);
    trace.nodeIds.push(edge.targetNodeId);

    if (visited.has(edge.targetNodeId)) {
      return {
        status: 'stopped',
        trace,
        reason: { code: 'cycle', nodeId: edge.targetNodeId },
      };
    }

    visited.add(edge.targetNodeId);
    currentNodeId = edge.targetNodeId;
  }
}

export const SERVICE_OUTCOME_KINDS = ['success', 'failure'] as const;

export type ServiceOutcomeKind = (typeof SERVICE_OUTCOME_KINDS)[number];

export interface ServiceOutcome {
  readonly kind: ServiceOutcomeKind;
  readonly code: string | null;
  readonly httpStatus: number | null;
}

export interface ScenarioOverride {
  readonly flowNodeId: string;
  readonly outcome: ServiceOutcome;
}

export interface Scenario {
  readonly id: string;
  readonly flowId: string;
  readonly name: string;
  readonly overrides: readonly ScenarioOverride[];
}

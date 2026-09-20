export { FLOW_EDGE_KINDS, FLOW_NODE_KINDS } from './flow.js';

export type {
  Flow,
  FlowEdge,
  FlowEdgeKind,
  FlowNode,
  FlowNodeKind,
} from './flow.js';

export { validateFlow } from './validate-flow.js';
export type { FlowValidationIssue } from './validate-flow.js';

export { CODE_ENTITY_KINDS, CODE_RELATION_KINDS } from './code.js';

export type {
  CodeEntity,
  CodeEntityKind,
  CodeGraph,
  CodeRelation,
  CodeRelationKind,
} from './code.js';

export type { CodeReference, CodeReferenceRole } from './code-reference.js';

export { validateCodeGraph } from './validate-code-graph.js';

export type { CodeGraphValidationIssue } from './validate-code-graph.js';

export { resolveCodeReference } from './resolve-code-reference.js';

export type { CodeReferenceResolution } from './resolve-code-reference.js';

export type { SnapshotGitState, SyncSnapshot } from './snapshot.js';

export { diffSnapshotEntities } from './diff-snapshot-entities.js';

export type {
  CodeChange,
  SnapshotEntityDiff,
} from './diff-snapshot-entities.js';

export { diffSnapshotRelations } from './diff-snapshot-relations.js';

export type {
  CodeRelationChange,
  SnapshotRelationDiff,
} from './diff-snapshot-relations.js';

export { analyzeEntityFlowImpacts } from './analyze-entity-flow-impacts.js';

export type {
  FlowImpact,
  FlowImpactAnalysis,
  FlowImpactReason,
} from './analyze-entity-flow-impacts.js';

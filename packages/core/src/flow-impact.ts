import type {
  CodeChange,
  SnapshotEntityDiff,
} from './diff-snapshot-entities.js';
import type { CodeRelationChange } from './diff-snapshot-relations.js';

export type FlowImpactReason =
  | {
      readonly type: 'entity';
      readonly referenceId: string;
      readonly nodeId: string;
      readonly change: CodeChange;
    }
  | {
      readonly type: 'relation';
      readonly referenceId: string;
      readonly nodeId: string;
      readonly entityId: string;
      readonly change: CodeRelationChange;
    };

export interface FlowImpact {
  readonly flowId: string;
  readonly reasons: readonly FlowImpactReason[];
}

export type FlowImpactAnalysis =
  | {
      readonly status: 'analyzed';
      readonly repositoryId: string;
      readonly beforeSnapshotId: string;
      readonly afterSnapshotId: string;
      readonly impacts: readonly FlowImpact[];
    }
  | Extract<SnapshotEntityDiff, { status: 'incompatible' }>;

import type { CodeGraph } from './code.js';

export type CodeGraphValidationIssue =
  | {
      readonly code: 'duplicate_entity_id';
      readonly entityId: string;
    }
  | {
      readonly code: 'duplicate_relation_id';
      readonly relationId: string;
    }
  | {
      readonly code: 'relation_source_not_found' | 'relation_target_not_found';
      readonly relationId: string;
      readonly entityId: string;
    };

export function validateCodeGraph(
  graph: CodeGraph,
): readonly CodeGraphValidationIssue[] {
  const issues: CodeGraphValidationIssue[] = [];
  const entityIds = new Set<string>();
  const relationIds = new Set<string>();

  for (const entity of graph.entities) {
    if (entityIds.has(entity.id)) {
      issues.push({
        code: 'duplicate_entity_id',
        entityId: entity.id,
      });
    }

    entityIds.add(entity.id);
  }

  for (const relation of graph.relations) {
    if (relationIds.has(relation.id)) {
      issues.push({
        code: 'duplicate_relation_id',
        relationId: relation.id,
      });
    }

    relationIds.add(relation.id);

    if (!entityIds.has(relation.sourceEntityId)) {
      issues.push({
        code: 'relation_source_not_found',
        relationId: relation.id,
        entityId: relation.sourceEntityId,
      });
    }

    if (!entityIds.has(relation.targetEntityId)) {
      issues.push({
        code: 'relation_target_not_found',
        relationId: relation.id,
        entityId: relation.targetEntityId,
      });
    }
  }

  return issues;
}

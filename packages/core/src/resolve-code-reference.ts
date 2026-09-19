import type { CodeReference } from './code-reference.js';
import type { CodeEntity, CodeGraph } from './code.js';

export type CodeReferenceResolution =
  | {
      readonly status: 'resolved';
      readonly entity: CodeEntity;
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'graph_unavailable';
    };

/**
 * Resolves a reference against an already validated code graph.
 */
export function resolveCodeReference(
  reference: CodeReference,
  graph: CodeGraph | null,
): CodeReferenceResolution {
  if (graph === null || graph.repositoryId !== reference.repositoryId) {
    return { status: 'graph_unavailable' };
  }

  const entity = graph.entities.find(
    (candidate) => candidate.id === reference.codeEntityId,
  );

  if (entity === undefined) {
    return { status: 'not_found' };
  }

  return {
    status: 'resolved',
    entity,
  };
}

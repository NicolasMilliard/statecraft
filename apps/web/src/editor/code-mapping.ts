import type {
  CodeGraph,
  CodeReferenceRole,
  Flow,
} from '@statecraft/core';

export function attachCodeEntity(
  flow: Flow,
  graph: CodeGraph,
  nodeId: string,
  entityId: string,
  role: CodeReferenceRole,
  referenceId: string,
): Flow {
  if (
    !flow.nodes.some((node) => node.id === nodeId) ||
    !graph.entities.some((entity) => entity.id === entityId) ||
    flow.codeReferences.some((reference) => reference.id === referenceId) ||
    flow.codeReferences.some(
      (reference) =>
        reference.flowNodeId === nodeId &&
        reference.repositoryId === graph.repositoryId &&
        reference.codeEntityId === entityId,
    )
  ) {
    return flow;
  }

  return {
    ...flow,
    codeReferences: [
      ...flow.codeReferences,
      {
        id: referenceId,
        flowNodeId: nodeId,
        repositoryId: graph.repositoryId,
        codeEntityId: entityId,
        role,
      },
    ],
  };
}

export function setCodeReferenceRole(
  flow: Flow,
  referenceId: string,
  role: CodeReferenceRole,
): Flow {
  if (!flow.codeReferences.some(
    (reference) => reference.id === referenceId && reference.role !== role,
  )) {
    return flow;
  }

  return {
    ...flow,
    codeReferences: flow.codeReferences.map((reference) =>
      reference.id === referenceId ? { ...reference, role } : reference,
    ),
  };
}

export function removeCodeReference(flow: Flow, referenceId: string): Flow {
  if (!flow.codeReferences.some((reference) => reference.id === referenceId)) {
    return flow;
  }

  return {
    ...flow,
    codeReferences: flow.codeReferences.filter(
      (reference) => reference.id !== referenceId,
    ),
  };
}

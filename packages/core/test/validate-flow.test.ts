import assert from "node:assert/strict";
import test from "node:test";

import { resolveCodeReference, validateFlow } from "@statecraft/core";
import type { CodeReference, Flow } from "@statecraft/core";

function createFlow(): Flow {
  return {
    id: "checkout",
    name: "Checkout",
    entryNodeId: "order",
    nodes: [
      { id: "order", kind: "service", label: "POST /orders" },
      { id: "success", kind: "state", label: "Success" },
      { id: "failure", kind: "state", label: "Failure" },
    ],
    edges: [
      {
        id: "success-path",
        sourceNodeId: "order",
        targetNodeId: "success",
        kind: "success",
      },
      {
        id: "failure-path",
        sourceNodeId: "order",
        targetNodeId: "failure",
        kind: "failure",
      },
    ],
    codeReferences: [],
  };
}

function createReference(): CodeReference {
  return {
    id: "order-code",
    flowNodeId: "order",
    repositoryId: "storefront",
    codeEntityId: "create-order",
    role: "primary",
  };
}

void test("accepts a consistent flow with success and failure branches", () => {
  assert.deepEqual(validateFlow(createFlow()), []);
});

void test("accepts an empty draft", () => {
  const flow: Flow = {
    ...createFlow(),
    entryNodeId: null,
    nodes: [],
    edges: [],
  };

  assert.deepEqual(validateFlow(flow), []);
});

void test("accepts a draft with nodes but no entry point or edges", () => {
  const flow: Flow = {
    ...createFlow(),
    entryNodeId: null,
    edges: [],
  };

  assert.deepEqual(validateFlow(flow), []);
});

void test("reports duplicate node and edge identifiers", () => {
  const flow = createFlow();
  const [node] = flow.nodes;
  const [edge] = flow.edges;

  assert.ok(node);
  assert.ok(edge);

  const issues = validateFlow({
    ...flow,
    nodes: [...flow.nodes, node],
    edges: [...flow.edges, edge],
  });

  assert.deepEqual(issues, [
    { code: "duplicate_node_id", nodeId: "order" },
    { code: "duplicate_edge_id", edgeId: "success-path" },
  ]);
});

void test("reports an entry point referencing a missing node", () => {
  const flow: Flow = {
    ...createFlow(),
    entryNodeId: "missing",
  };

  assert.deepEqual(validateFlow(flow), [
    { code: "entry_node_not_found", nodeId: "missing" },
  ]);
});

void test("reports both missing endpoints of an edge", () => {
  const flow: Flow = {
    ...createFlow(),
    edges: [
      {
        id: "broken-edge",
        sourceNodeId: "missing-source",
        targetNodeId: "missing-target",
        kind: "transition",
      },
    ],
  };

  assert.deepEqual(validateFlow(flow), [
    {
      code: "edge_source_not_found",
      edgeId: "broken-edge",
      nodeId: "missing-source",
    },
    {
      code: "edge_target_not_found",
      edgeId: "broken-edge",
      nodeId: "missing-target",
    },
  ]);
});

void test("accepts cycles and disconnected nodes", () => {
  const flow = createFlow();

  const issues = validateFlow({
    ...flow,
    nodes: [...flow.nodes, { id: "sidebar", kind: "ui", label: "Sidebar" }],
    edges: [
      ...flow.edges,
      {
        id: "retry",
        sourceNodeId: "failure",
        targetNodeId: "order",
        kind: "transition",
      },
    ],
  });

  assert.deepEqual(issues, []);
});

void test("does not modify the input flow", () => {
  const flow = createFlow();
  const before = structuredClone(flow);

  validateFlow(flow);

  assert.deepEqual(flow, before);
});

void test("accepts multiple code references on one node", () => {
  const reference = createReference();

  const flow: Flow = {
    ...createFlow(),
    codeReferences: [
      reference,
      {
        ...reference,
        id: "order-schema-code",
        codeEntityId: "order-schema",
        role: "dependency",
      },
    ],
  };

  assert.deepEqual(validateFlow(flow), []);
});

void test("accepts a code entity shared by multiple nodes", () => {
  const reference = createReference();

  const flow: Flow = {
    ...createFlow(),
    codeReferences: [
      reference,
      {
        ...reference,
        id: "success-code",
        flowNodeId: "success",
        role: "dependency",
      },
    ],
  };

  assert.deepEqual(validateFlow(flow), []);
});

void test("reports duplicate code reference identifiers", () => {
  const reference = createReference();

  const flow: Flow = {
    ...createFlow(),
    codeReferences: [
      reference,
      {
        ...reference,
        flowNodeId: "success",
      },
    ],
  };

  assert.deepEqual(validateFlow(flow), [
    {
      code: "duplicate_code_reference_id",
      referenceId: "order-code",
    },
  ]);
});

void test("reports a missing referenced node without modifying the flow", () => {
  const flow: Flow = {
    ...createFlow(),
    codeReferences: [
      {
        ...createReference(),
        flowNodeId: "missing-node",
      },
    ],
  };

  const before = structuredClone(flow);

  assert.deepEqual(validateFlow(flow), [
    {
      code: "code_reference_node_not_found",
      referenceId: "order-code",
      nodeId: "missing-node",
    },
  ]);

  assert.deepEqual(flow, before);
});

void test("accepts structurally valid references with unresolved code", () => {
  const reference = createReference();

  const flow: Flow = {
    ...createFlow(),
    codeReferences: [reference],
  };

  assert.deepEqual(resolveCodeReference(reference, null), {
    status: "graph_unavailable",
  });

  assert.deepEqual(
    resolveCodeReference(reference, {
      repositoryId: reference.repositoryId,
      entities: [],
      relations: [],
    }),
    { status: "not_found" }
  );

  assert.deepEqual(validateFlow(flow), []);
  assert.deepEqual(flow.codeReferences, [reference]);
});

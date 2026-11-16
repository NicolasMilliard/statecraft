import assert from "node:assert/strict";
import { test } from "node:test";

import type { SnapshotDocument } from "@statecraft/core";

import { describeFileOpening } from "../src/editor/describe-file-opening.ts";
import { checkoutFlow, checkoutLayout } from "../src/examples/checkout.ts";

const document: SnapshotDocument = {
  formatVersion: 1,
  snapshot: {
    id: "a".repeat(64),
    capturedAt: "2026-10-10T10:00:00.000Z",
    git: { commitSha: "b".repeat(40), isDirty: false },
    analysisProfileId: "react-ts-v1",
    graph: { repositoryId: "storefront", entities: [], relations: [] },
  },
  diagnostics: [],
};

void test("drop confirmation names the Flow that would be replaced and its unsaved work", () => {
  const description = describeFileOpening(
    {
      kind: "flow",
      editor: {
        flow: { ...checkoutFlow, name: "Imported checkout" },
        layout: checkoutLayout,
        initialLayout: checkoutLayout,
        scenarios: [],
        reviews: [],
      },
    },
    "Current checkout",
    true,
    null
  );

  assert.match(description.title, /Imported checkout/u);
  assert.match(
    description.detail,
    /replace the current flow “Current checkout”/u
  );
  assert.match(description.detail, /Unsaved changes will be lost/u);
});

void test("drop confirmation names the snapshot to save without claiming the Flow changes", () => {
  const description = describeFileOpening(
    { kind: "snapshot", document },
    "Current checkout",
    true,
    {
      ...document,
      snapshot: {
        ...document.snapshot,
        graph: {
          ...document.snapshot.graph,
          repositoryId: "previous-repository",
        },
      },
    }
  );

  assert.match(description.title, /storefront/u);
  assert.match(
    description.detail,
    /current snapshot instead of “previous-repository”/u
  );
  assert.match(description.detail, /flow “Current checkout” will stay open/u);
});

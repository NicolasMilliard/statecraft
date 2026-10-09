import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanReport } from '@statecraft/core';
import { checkoutFlow, checkoutLayout } from '../src/examples/checkout.ts';
import { describeFileOpening } from '../src/editor/describe-file-opening.ts';

const report: ScanReport = {
  formatVersion: 1,
  analysisProfileId: 'react-ts-v1',
  graph: { repositoryId: 'storefront', entities: [], relations: [] },
  diagnostics: [],
};

test('drop confirmation names the Flow that would be replaced and its unsaved work', () => {
  const description = describeFileOpening(
    {
      kind: 'flow',
      editor: {
        flow: { ...checkoutFlow, name: 'Imported checkout' },
        layout: checkoutLayout,
        initialLayout: checkoutLayout,
        scenarios: [],
      },
    },
    'Current checkout',
    true,
    null,
  );

  assert.match(description.title, /Imported checkout/);
  assert.match(description.detail, /replace the current flow “Current checkout”/);
  assert.match(description.detail, /Unsaved changes will be lost/);
});

test('drop confirmation names the report being replaced without claiming the Flow changes', () => {
  const description = describeFileOpening(
    { kind: 'scan-report', report },
    'Current checkout',
    true,
    {
      ...report,
      graph: { ...report.graph, repositoryId: 'previous-repository' },
    },
  );

  assert.match(description.title, /storefront/);
  assert.match(description.detail, /replace the loaded report for “previous-repository”/);
  assert.match(description.detail, /flow “Current checkout” will stay open/);
});

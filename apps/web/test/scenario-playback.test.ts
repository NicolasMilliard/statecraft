import assert from 'node:assert/strict';
import test from 'node:test';
import type { Scenario } from '@statecraft/core';
import { checkoutFlow } from '../src/examples/checkout.ts';
import { createScenarioPlayback } from '../src/scenarios/use-scenario-playback.ts';

const scenario: Scenario = {
  id: 'checkout-default',
  flowId: checkoutFlow.id,
  name: 'Default checkout',
  overrides: [],
};

test('starts animated playback at the entry node', () => {
  const playback = createScenarioPlayback(checkoutFlow, scenario, false);

  assert.equal(playback.stepIndex, 0);
  assert.equal(playback.isPlaying, true);
  assert.equal(playback.result.trace.nodeIds[0], checkoutFlow.entryNodeId);
});

test('reduced motion shows the complete trace and terminal state immediately', () => {
  const playback = createScenarioPlayback(checkoutFlow, scenario, true);

  assert.equal(playback.isPlaying, false);
  assert.equal(playback.stepIndex, playback.result.trace.nodeIds.length - 1);
  assert.equal(playback.result.status, 'completed');
  if (playback.result.status === 'completed') {
    assert.equal(playback.result.terminalNodeId, 'order-confirmed');
  }
});

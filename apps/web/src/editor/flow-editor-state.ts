import type { Flow, Scenario } from '@statecraft/core';
import type { FlowLayout } from '../canvas/flow-layout';

export interface FlowEditorState {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly initialLayout: FlowLayout;
  readonly scenarios: readonly Scenario[];
}

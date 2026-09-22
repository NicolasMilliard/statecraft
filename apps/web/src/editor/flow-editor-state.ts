import type { Flow } from '@statecraft/core';
import type { FlowLayout } from '../canvas/flow-layout';

export interface FlowEditorState {
  readonly flow: Flow;
  readonly layout: FlowLayout;
  readonly initialLayout: FlowLayout;
}

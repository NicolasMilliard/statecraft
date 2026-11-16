interface CompositionKeyEvent {
  readonly isComposing: boolean;
  readonly keyCode: number;
}

/** Keep the legacy 229 fallback for browsers that end composition before keydown. */
export function isComposingKey(event: CompositionKeyEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

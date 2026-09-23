import { parseFlowDocument, serializeFlowDocument } from './flow-document.ts';
import type { FlowEditorState } from './flow-editor-state';

type LoadFlowResult =
  | {
      readonly status: 'loaded';
      readonly editor: FlowEditorState;
    }
  | {
      readonly status: 'missing' | 'invalid' | 'unavailable';
    };

type FlowDraftStorage = Pick<Storage, 'getItem' | 'setItem'>;

const ACTIVE_FLOW_KEY = 'statecraft:active-flow';

export function loadFlowDraft(
  fallbackFlowId: string,
  storage?: FlowDraftStorage,
): LoadFlowResult {
  let serialized: string | null;
  let expectedFlowId: string | undefined;

  try {
    const targetStorage = storage ?? window.localStorage;

    serialized = targetStorage.getItem(ACTIVE_FLOW_KEY);

    if (serialized === null) {
      serialized = targetStorage.getItem(`statecraft:flow:${fallbackFlowId}`);
      expectedFlowId = fallbackFlowId;
    }
  } catch {
    return { status: 'unavailable' };
  }

  if (serialized === null) {
    return { status: 'missing' };
  }

  try {
    const editor = parseFlowDocument(serialized, expectedFlowId);

    return { status: 'loaded', editor };
  } catch {
    return { status: 'invalid' };
  }
}

export function saveFlowDraft(
  editor: FlowEditorState,
  storage?: FlowDraftStorage,
): boolean {
  try {
    const serialized = serializeFlowDocument(editor);
    const targetStorage = storage ?? window.localStorage;

    targetStorage.setItem(ACTIVE_FLOW_KEY, serialized);

    return true;
  } catch {
    return false;
  }
}

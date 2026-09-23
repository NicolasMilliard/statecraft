import { parseFlowDocument, serializeFlowDocument } from './flow-document';
import type { FlowEditorState } from './flow-editor-state';

type LoadFlowResult =
  | {
      readonly status: 'loaded';
      readonly editor: FlowEditorState;
    }
  | {
      readonly status: 'missing' | 'invalid' | 'unavailable';
    };

function storageKey(flowId: string): string {
  return `statecraft:flow:${flowId}`;
}

export function loadFlowDraft(flowId: string): LoadFlowResult {
  let serialized: string | null;

  try {
    serialized = window.localStorage.getItem(storageKey(flowId));
  } catch {
    return { status: 'unavailable' };
  }

  if (serialized === null) {
    return { status: 'missing' };
  }

  try {
    const editor = parseFlowDocument(serialized, flowId);

    return { status: 'loaded', editor };
  } catch {
    return { status: 'invalid' };
  }
}

export function saveFlowDraft(editor: FlowEditorState): boolean {
  try {
    const serialized = serializeFlowDocument(editor);

    window.localStorage.setItem(storageKey(editor.flow.id), serialized);

    return true;
  } catch {
    return false;
  }
}

import { parseFlowDocument, serializeFlowDocument } from './flow-document.ts';
import type { FlowEditorState } from './flow-editor-state';

type LoadFlowResult =
  | { readonly status: 'loaded'; readonly editor: FlowEditorState }
  | { readonly status: 'missing' | 'invalid' | 'unavailable' };

type SavedFlowsResult =
  | { readonly status: 'loaded'; readonly editors: readonly FlowEditorState[]; readonly invalidCount: number }
  | { readonly status: 'unavailable'; readonly editors: readonly FlowEditorState[]; readonly invalidCount: number };

type FlowDraftStorage = Pick<Storage, 'getItem' | 'setItem'>;
type FlowCatalogStorage = FlowDraftStorage & Pick<Storage, 'key' | 'length'>;

const LEGACY_ACTIVE_FLOW_KEY = 'statecraft:active-flow';
const LEGACY_FLOW_PREFIX = 'statecraft:flow:';
const ACTIVE_FLOW_ID_KEY = 'statecraft:active-flow-id';
const SAVED_FLOW_PREFIX = 'statecraft:saved-flow:';

function savedFlowKey(flowId: string): string {
  return `${SAVED_FLOW_PREFIX}${flowId}`;
}

function parseStoredFlow(serialized: string, flowId?: string): FlowEditorState {
  return parseFlowDocument(serialized, flowId);
}

function migrateLegacyActive(storage: FlowDraftStorage): void {
  if (storage.getItem(ACTIVE_FLOW_ID_KEY) !== null) return;

  const serialized = storage.getItem(LEGACY_ACTIVE_FLOW_KEY);
  if (serialized === null) return;

  let editor: FlowEditorState;
  try {
    editor = parseStoredFlow(serialized);
  } catch {
    // Keep an invalid legacy document untouched so it can still be recovered.
    return;
  }

  if (storage.getItem(savedFlowKey(editor.flow.id)) !== serialized) {
    storage.setItem(savedFlowKey(editor.flow.id), serialized);
  }
}

export function loadFlowDraft(
  fallbackFlowId: string,
  storage?: FlowDraftStorage,
): LoadFlowResult {
  try {
    const target = storage ?? window.localStorage;
    const activeId = target.getItem(ACTIVE_FLOW_ID_KEY);
    const legacyActive = activeId === null ? target.getItem(LEGACY_ACTIVE_FLOW_KEY) : null;
    const serialized = activeId !== null
      ? target.getItem(savedFlowKey(activeId))
      : legacyActive ??
        target.getItem(`${LEGACY_FLOW_PREFIX}${fallbackFlowId}`);

    if (serialized === null) {
      return { status: activeId === null ? 'missing' : 'invalid' };
    }

    try {
      return {
        status: 'loaded',
        editor: parseStoredFlow(serialized, activeId ?? (legacyActive === null ? fallbackFlowId : undefined)),
      };
    } catch {
      return { status: 'invalid' };
    }
  } catch {
    return { status: 'unavailable' };
  }
}

export function loadSavedFlows(storage?: FlowCatalogStorage): SavedFlowsResult {
  try {
    const target = storage ?? window.localStorage;
    const keys: string[] = [];
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (key !== null && (key.startsWith(SAVED_FLOW_PREFIX) || key.startsWith(LEGACY_FLOW_PREFIX))) {
        keys.push(key);
      }
    }

    // A canonical saved copy wins over an older legacy copy with the same ID.
    keys.sort((left, right) =>
      Number(right.startsWith(SAVED_FLOW_PREFIX)) - Number(left.startsWith(SAVED_FLOW_PREFIX)) ||
      left.localeCompare(right),
    );

    const editors = new Map<string, FlowEditorState>();
    const seenIds = new Set<string>();
    let invalidCount = 0;

    for (const key of keys) {
      const flowId = key.slice(key.startsWith(SAVED_FLOW_PREFIX) ? SAVED_FLOW_PREFIX.length : LEGACY_FLOW_PREFIX.length);
      if (seenIds.has(flowId)) continue;
      seenIds.add(flowId);
      try {
        const serialized = target.getItem(key);
        if (serialized === null) throw new Error('Missing saved Flow.');
        editors.set(flowId, parseStoredFlow(serialized, flowId));
      } catch {
        invalidCount += 1;
      }
    }

    if (target.getItem(ACTIVE_FLOW_ID_KEY) === null) {
      const legacyActive = target.getItem(LEGACY_ACTIVE_FLOW_KEY);
      if (legacyActive !== null) {
        try {
          const editor = parseStoredFlow(legacyActive);
          editors.set(editor.flow.id, editor);
        } catch {
          invalidCount += 1;
        }
      }
    }

    return {
      status: 'loaded',
      editors: [...editors.values()].sort((left, right) =>
        left.flow.name.localeCompare(right.flow.name) || left.flow.id.localeCompare(right.flow.id),
      ),
      invalidCount,
    };
  } catch {
    return { status: 'unavailable', editors: [], invalidCount: 0 };
  }
}

export function saveFlowDraft(
  editor: FlowEditorState,
  storage?: FlowDraftStorage,
): boolean {
  try {
    const serialized = serializeFlowDocument(editor);
    const target = storage ?? window.localStorage;
    migrateLegacyActive(target);
    target.setItem(savedFlowKey(editor.flow.id), serialized);
    target.setItem(ACTIVE_FLOW_ID_KEY, editor.flow.id);
    return true;
  } catch {
    return false;
  }
}

export function openSavedFlowDraft(
  flowId: string,
  storage?: FlowDraftStorage,
): LoadFlowResult {
  try {
    const target = storage ?? window.localStorage;
    const serialized = target.getItem(savedFlowKey(flowId)) ??
      target.getItem(`${LEGACY_FLOW_PREFIX}${flowId}`);
    if (serialized === null) {
      const legacyActive = target.getItem(LEGACY_ACTIVE_FLOW_KEY);
      if (legacyActive === null) return { status: 'missing' };
      const editor = parseStoredFlow(legacyActive);
      if (editor.flow.id !== flowId) return { status: 'missing' };
      migrateLegacyActive(target);
      target.setItem(ACTIVE_FLOW_ID_KEY, flowId);
      return { status: 'loaded', editor };
    }

    const editor = parseStoredFlow(serialized, flowId);
    migrateLegacyActive(target);
    if (target.getItem(savedFlowKey(flowId)) === null) {
      target.setItem(savedFlowKey(flowId), serialized);
    }
    target.setItem(ACTIVE_FLOW_ID_KEY, flowId);
    return { status: 'loaded', editor };
  } catch {
    return { status: 'unavailable' };
  }
}

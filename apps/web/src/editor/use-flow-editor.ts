import {
  recordFlowReview,
  type CodeGraph,
  type CodeReferenceRole,
  type Flow,
  type FlowEdge,
  type FlowEdgeKind,
  type FlowNode,
  type FlowNodeKind,
  type ServiceOutcome,
  type SyncSnapshot,
} from '@statecraft/core';
import { useCallback, useState } from 'react';
import type { FlowLayout, FlowNodePosition } from '../canvas/flow-layout';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { canAddFlowEdge } from './can-add-flow-edge';
import { attachCodeEntity, removeCodeReference, setCodeReferenceRole } from './code-mapping';
import { deleteFlowElements } from './delete-flow-elements';
import { serializeFlowDocument } from './flow-document';
import type { FlowEditorState } from './flow-editor-state';
import { loadFlowDraft, loadSavedFlows, openSavedFlowDraft, saveFlowDraft, saveFlowReviewCheckpoint } from './flow-storage';
import {
  addScenario,
  duplicateScenario,
  removeScenario,
  renameScenario,
  setScenarioOverride,
} from './scenario-editing';
import { useHistoryState } from './use-history-state';
import type { StorageIssue } from './storage-feedback';

function areLayoutsEqual(left: FlowLayout, right: FlowLayout): boolean {
  const entries = Object.entries(left.positions);

  if (
    left.flowId !== right.flowId ||
    entries.length !== Object.keys(right.positions).length
  ) {
    return false;
  }

  return entries.every(([nodeId, position]) => {
    const otherPosition = right.positions[nodeId];

    return position.x === otherPosition?.x && position.y === otherPosition?.y;
  });
}

function describeCatalogIssue(result: ReturnType<typeof loadSavedFlows>): string | null {
  if (result.status === 'unavailable') return 'Saved flows could not be listed.';
  if (result.invalidCount === 0) return null;
  return `${result.invalidCount} saved ${result.invalidCount === 1 ? 'flow' : 'flows'} could not be opened.`;
}

export function useFlowEditor(initialFlow: Flow, initialLayout: FlowLayout) {
  const [initialCatalog] = useState(() => loadSavedFlows());
  const [initialDocument] = useState(() => {
    const result = loadFlowDraft(initialFlow.id);

    const editor: FlowEditorState =
      result.status === 'loaded'
        ? result.editor
        : {
            flow: initialFlow,
            layout: initialLayout,
            initialLayout,
            scenarios: [],
            reviews: [],
          };

    const issue: StorageIssue | null = result.status === 'invalid'
      ? 'invalid-draft'
      : result.status === 'unavailable' ? 'unavailable' : null;

    return {
      editor,
      isSaved: result.status === 'loaded',
      hasInvalidSavedDraft: result.status === 'invalid',
      issue,
    };
  });

  const {
    state: editor,
    setState: setEditor,
    replaceState: replaceEditor,
    commitState: commitEditor,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<FlowEditorState>(() => initialDocument.editor);

  const [savedEditor, setSavedEditor] = useState<FlowEditorState | null>(
    initialDocument.isSaved ? initialDocument.editor : null,
  );

  const [storageIssue, setStorageIssue] = useState<StorageIssue | null>(
    initialDocument.issue,
  );
  const [reviewSaveFailed, setReviewSaveFailed] = useState(false);
  const [savedFlows, setSavedFlows] = useState<readonly FlowEditorState[]>(initialCatalog.editors);
  const [catalogIssue, setCatalogIssue] = useState<string | null>(
    describeCatalogIssue(initialCatalog),
  );

  function refreshCatalog() {
    const result = loadSavedFlows();
    if (result.status === 'loaded') setSavedFlows(result.editors);
    setCatalogIssue(describeCatalogIssue(result));
  }

  function createFlow() {
    const flowId = crypto.randomUUID();

    const next: FlowEditorState = {
      flow: {
        id: flowId,
        name: 'Untitled flow',
        entryNodeId: null,
        nodes: [],
        edges: [],
        codeReferences: [],
      },
      layout: {
        flowId,
        positions: {},
      },
      initialLayout: {
        flowId,
        positions: {},
      },
      scenarios: [],
      reviews: [],
    };

    replaceEditor(next);
    setSavedEditor(null);
    setReviewSaveFailed(false);
  }

  function openSavedFlow(flowId: string): boolean {
    const result = openSavedFlowDraft(flowId);
    if (result.status !== 'loaded') {
      setCatalogIssue('This saved flow could not be opened. Your current flow is unchanged.');
      return false;
    }

    replaceEditor(result.editor);
    setSavedEditor(result.editor);
    setStorageIssue(null);
    setReviewSaveFailed(false);
    refreshCatalog();
    return true;
  }

  function addNode(kind: FlowNodeKind, position: FlowNodePosition): string {
    const node: FlowNode = {
      id: crypto.randomUUID(),
      kind,
      label: `New ${NODE_KIND_LABELS[kind]}`,
    };

    const initialPosition = { ...position };

    setEditor((current) => ({
      ...current,
      flow: {
        ...current.flow,
        nodes: [...current.flow.nodes, node],
      },
      layout: {
        ...current.layout,
        positions: {
          ...current.layout.positions,
          [node.id]: initialPosition,
        },
      },
      initialLayout: {
        ...current.initialLayout,
        positions: {
          ...current.initialLayout.positions,
          [node.id]: initialPosition,
        },
      },
    }));

    return node.id;
  }

  const connectNodes = useCallback(
    (sourceNodeId: string, targetNodeId: string) => {
      const edge: FlowEdge = {
        id: crypto.randomUUID(),
        sourceNodeId,
        targetNodeId,
        kind: 'transition',
      };

      setEditor((current) => {
        if (
          !canAddFlowEdge(current.flow, sourceNodeId, targetNodeId, edge.kind)
        ) {
          return current;
        }

        return {
          ...current,
          flow: {
            ...current.flow,
            edges: [...current.flow.edges, edge],
          },
        };
      });
    },
    [setEditor],
  );

  function renameFlow(name: string) {
    const normalizedName = name.trim();

    if (normalizedName.length === 0) {
      return;
    }

    setEditor((current) => {
      if (current.flow.name === normalizedName) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          name: normalizedName,
        },
      };
    });
  }

  function renameNode(nodeId: string, label: string) {
    const normalizedLabel = label.trim();

    if (normalizedLabel.length === 0) {
      return;
    }

    setEditor((current) => {
      const targetNode = current.flow.nodes.find((node) => node.id === nodeId);

      if (targetNode === undefined || targetNode.label === normalizedLabel) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          nodes: current.flow.nodes.map((node) =>
            node.id === nodeId ? { ...node, label: normalizedLabel } : node,
          ),
        },
      };
    });
  }

  function setEntryNode(nodeId: string | null) {
    setEditor((current) => {
      if (current.flow.entryNodeId === nodeId) {
        return current;
      }

      if (
        nodeId !== null &&
        !current.flow.nodes.some((node) => node.id === nodeId)
      ) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          entryNodeId: nodeId,
        },
      };
    });
  }

  function setEdgeKind(edgeId: string, kind: FlowEdgeKind) {
    setEditor((current) => {
      const targetEdge = current.flow.edges.find((edge) => edge.id === edgeId);

      if (targetEdge === undefined || targetEdge.kind === kind) {
        return current;
      }

      if (
        !canAddFlowEdge(
          current.flow,
          targetEdge.sourceNodeId,
          targetEdge.targetNodeId,
          kind,
          edgeId,
        )
      ) {
        return current;
      }

      return {
        ...current,
        flow: {
          ...current.flow,
          edges: current.flow.edges.map((edge) =>
            edge.id === edgeId ? { ...edge, kind } : edge,
          ),
        },
      };
    });
  }

  function attachEntity(
    graph: CodeGraph,
    nodeId: string,
    entityId: string,
    role: CodeReferenceRole,
  ) {
    const referenceId = crypto.randomUUID();

    setEditor((current) => {
      const flow = attachCodeEntity(
        current.flow,
        graph,
        nodeId,
        entityId,
        role,
        referenceId,
      );
      return flow === current.flow ? current : { ...current, flow };
    });
  }

  function changeReferenceRole(referenceId: string, role: CodeReferenceRole) {
    setEditor((current) => {
      const flow = setCodeReferenceRole(current.flow, referenceId, role);
      return flow === current.flow ? current : { ...current, flow };
    });
  }

  function detachReference(referenceId: string) {
    setEditor((current) => {
      const flow = removeCodeReference(current.flow, referenceId);
      return flow === current.flow ? current : { ...current, flow };
    });
  }

  function deleteElements(
    nodeIds: readonly string[],
    edgeIds: readonly string[],
  ) {
    setEditor((current) => deleteFlowElements(current, nodeIds, edgeIds));
  }

  function deleteEdge(edgeId: string) {
    deleteElements([], [edgeId]);
  }

  function deleteNode(nodeId: string) {
    deleteElements([nodeId], []);
  }

  function createScenario(): string {
    const scenarioId = crypto.randomUUID();
    setEditor((current) => addScenario(current, scenarioId));
    return scenarioId;
  }

  function copyScenario(sourceScenarioId: string): string | null {
    if (!editor.scenarios.some((scenario) => scenario.id === sourceScenarioId)) {
      return null;
    }

    const scenarioId = crypto.randomUUID();
    setEditor((current) => duplicateScenario(current, sourceScenarioId, scenarioId));
    return scenarioId;
  }

  function changeScenarioName(scenarioId: string, name: string) {
    setEditor((current) => renameScenario(current, scenarioId, name));
  }

  function deleteScenario(scenarioId: string) {
    setEditor((current) => removeScenario(current, scenarioId));
  }

  function changeScenarioOverride(
    scenarioId: string,
    flowNodeId: string,
    outcome: ServiceOutcome | null,
  ) {
    setEditor((current) =>
      setScenarioOverride(current, scenarioId, flowNodeId, outcome),
    );
  }

  function save() {
    if (!saveFlowDraft(editor)) {
      setStorageIssue('save-failed');
      return false;
    }

    setSavedEditor(editor);
    setStorageIssue(null);
    setReviewSaveFailed(false);
    refreshCatalog();
    return true;
  }

  function markReviewed(snapshot: SyncSnapshot): boolean {
    if (
      savedEditor === null ||
      editor !== savedEditor ||
      !editor.flow.codeReferences.some((reference) =>
        reference.repositoryId === snapshot.graph.repositoryId)
    ) {
      return false;
    }

    const reviewed: FlowEditorState = {
      ...editor,
      reviews: recordFlowReview(editor.reviews, editor.flow, snapshot),
    };

    if (!saveFlowReviewCheckpoint(reviewed)) {
      setReviewSaveFailed(true);
      return false;
    }

    // Undo remains available for edits without rolling back the explicit review.
    commitEditor(reviewed, (historical) => ({
      ...historical,
      reviews: reviewed.reviews,
    }));
    setSavedEditor(reviewed);
    setStorageIssue(null);
    setReviewSaveFailed(false);
    refreshCatalog();
    return true;
  }

  function exportDocument(): string {
    return serializeFlowDocument(editor);
  }

  function restoreEditor(restored: FlowEditorState): void {
    setReviewSaveFailed(false);
    if (restored.flow.id === editor.flow.id) {
      const restoredDocument = serializeFlowDocument(restored);
      setEditor((current) =>
        serializeFlowDocument(current) === restoredDocument ? current : restored,
      );
    } else {
      replaceEditor(restored);
      setSavedEditor(null);
    }
  }

  const updateLayout = useCallback(
    (nextLayout: FlowLayout) => {
      setEditor((current) => {
        if (
          nextLayout.flowId !== current.flow.id ||
          areLayoutsEqual(current.layout, nextLayout)
        ) {
          return current;
        }

        return {
          ...current,
          layout: nextLayout,
        };
      });
    },
    [setEditor],
  );

  function resetLayout() {
    setEditor((current) => {
      if (areLayoutsEqual(current.layout, current.initialLayout)) {
        return current;
      }

      return {
        ...current,
        layout: current.initialLayout,
      };
    });
  }

  return {
    flow: editor.flow,
    layout: editor.layout,
    scenarios: editor.scenarios,
    savedFlows,
    catalogIssue,
    createFlow,
    openSavedFlow,
    addNode,
    connectNodes,
    renameFlow,
    renameNode,
    setEntryNode,
    setEdgeKind,
    attachEntity,
    changeReferenceRole,
    detachReference,
    deleteNode,
    deleteEdge,
    deleteElements,
    createScenario,
    copyScenario,
    changeScenarioName,
    deleteScenario,
    changeScenarioOverride,
    undo,
    redo,
    canUndo,
    canRedo,
    save,
    markReviewed,
    reviews: editor.reviews,
    reviewSaveFailed,
    exportDocument,
    restoreEditor,
    storageIssue,
    hasUnsavedChanges: editor !== savedEditor,
    willReplaceInvalidDraft:
      initialDocument.hasInvalidSavedDraft && savedEditor === null,
    updateLayout,
    resetLayout,
  };
}

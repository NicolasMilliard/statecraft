import type { Flow } from '@statecraft/core';
import { useMemo, useState } from 'react';
import type { CanvasPlayback } from '../canvas/FlowCanvas';
import type { useFlowEditor } from '../editor/use-flow-editor';
import { useScenarioPlayback } from './use-scenario-playback';

export function useScenarioWorkspace(flow: Flow, editor: ReturnType<typeof useFlowEditor>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusNameId, setFocusNameId] = useState<string | null>(null);
  const selected = editor.scenarios.find((scenario) => scenario.id === selectedId) ??
    editor.scenarios[0] ?? null;
  const run = useScenarioPlayback(flow, selected);
  const trace = run.playback?.result.trace ?? null;
  const step = run.playback?.stepIndex ?? -1;
  const canvasPlayback = useMemo<CanvasPlayback | null>(() => trace === null ? null : {
    currentNodeId: trace.nodeIds[step] ?? null,
    visitedNodeIds: trace.nodeIds.slice(0, step + 1),
    currentEdgeId: step > 0 ? trace.edgeIds[step - 1] ?? null : null,
    visitedEdgeIds: trace.edgeIds.slice(0, step),
  }, [trace, step]);

  function reset() {
    setSelectedId(null);
    setFocusNameId(null);
  }

  function select(id: string) {
    setSelectedId(id);
    setFocusNameId(null);
  }

  function create() {
    const id = editor.createScenario();
    setSelectedId(id);
    setFocusNameId(id);
  }

  function duplicate(id: string) {
    const duplicateId = editor.copyScenario(id);
    if (duplicateId !== null) {
      setSelectedId(duplicateId);
      setFocusNameId(duplicateId);
    }
  }

  function remove(id: string) {
    editor.deleteScenario(id);
    reset();
  }

  return {
    selected,
    focusNameId,
    canvasPlayback,
    playback: run.playback,
    run: run.start,
    pause: run.pause,
    resume: run.resume,
    nextStep: run.nextStep,
    restart: run.restart,
    nameFocusHandled: () => setFocusNameId(null),
    reset,
    select,
    create,
    duplicate,
    remove,
  };
}

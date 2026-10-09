import { runScenario, type Flow, type Scenario, type ScenarioRunResult } from '@statecraft/core';
import { useEffect, useState } from 'react';

const STEP_DELAY_MS = 650;

export interface ScenarioPlayback {
  readonly flow: Flow;
  readonly scenario: Scenario;
  readonly result: ScenarioRunResult;
  readonly stepIndex: number;
  readonly isPlaying: boolean;
}

function lastStep(playback: ScenarioPlayback): number {
  return playback.result.trace.nodeIds.length - 1;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useScenarioPlayback(flow: Flow, scenario: Scenario | null) {
  const [playback, setPlayback] = useState<ScenarioPlayback | null>(null);
  const current = playback?.flow === flow && playback.scenario === scenario
    ? playback
    : null;

  if (playback !== null && current === null) setPlayback(null);

  useEffect(() => {
    if (current === null || !current.isPlaying) return;

    const timer = window.setTimeout(() => {
      setPlayback((previous) => {
        if (previous !== current) return previous;
        const stepIndex = previous.stepIndex + 1;
        return {
          ...previous,
          stepIndex,
          isPlaying: stepIndex < lastStep(previous),
        };
      });
    }, STEP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [current]);

  function start() {
    if (scenario === null) return;
    const result = runScenario(flow, scenario);
    const last = result.trace.nodeIds.length - 1;
    const reduceMotion = prefersReducedMotion();
    setPlayback({
      flow,
      scenario,
      result,
      stepIndex: reduceMotion ? last : Math.min(0, last),
      isPlaying: !reduceMotion && last > 0,
    });
  }

  function pause() {
    setPlayback((previous) => previous === null ? null : { ...previous, isPlaying: false });
  }

  function resume() {
    setPlayback((previous) => {
      if (previous === null || previous.stepIndex >= lastStep(previous)) return previous;
      return prefersReducedMotion()
        ? { ...previous, stepIndex: lastStep(previous), isPlaying: false }
        : { ...previous, isPlaying: true };
    });
  }

  function nextStep() {
    setPlayback((previous) => {
      if (previous === null || previous.isPlaying) return previous;
      return {
        ...previous,
        stepIndex: Math.min(previous.stepIndex + 1, lastStep(previous)),
      };
    });
  }

  function restart() {
    setPlayback((previous) => previous === null ? null : {
      ...previous,
      stepIndex: Math.min(0, lastStep(previous)),
      isPlaying: false,
    });
  }

  return { playback: current, start, pause, resume, nextStep, restart };
}

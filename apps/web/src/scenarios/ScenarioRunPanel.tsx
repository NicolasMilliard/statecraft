import type { Flow, ScenarioRunStopReason, ScenarioRunTrace } from '@statecraft/core';
import { Button } from '../ui/Button';
import type { ScenarioPlayback } from './use-scenario-playback';

interface ScenarioRunPanelProps {
  readonly flow: Flow;
  readonly playback: ScenarioPlayback | null;
  readonly onRun: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onNextStep: () => void;
  readonly onRestart: () => void;
}

function nodeLabel(flow: Flow, nodeId: string): string {
  return flow.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function stopMessage(reason: ScenarioRunStopReason, flow: Flow): string {
  switch (reason.code) {
    case 'invalid_flow':
      return 'This Flow has invalid references. Fix its nodes and connections, then run again.';
    case 'invalid_scenario':
      return 'This scenario has invalid overrides. Edit its Service outcomes, then run again.';
    case 'missing_entry':
      return 'No entry point. Select a node in Inspector and set it as the entry point.';
    case 'missing_branch':
      return `${nodeLabel(flow, reason.nodeId)} has no ${reason.expectedEdgeKind} connection. Add one or change the simulated outcome.`;
    case 'ambiguous_branch':
      return `${nodeLabel(flow, reason.nodeId)} has multiple ${reason.expectedEdgeKind} connections. Keep one matching connection.`;
    case 'cycle':
      return `The path returns to ${nodeLabel(flow, reason.nodeId)}. Remove or redirect a connection to complete the run.`;
  }
}

function outcomeAt(trace: ScenarioRunTrace, nodeId: string) {
  return trace.serviceOutcomes.find((item) => item.flowNodeId === nodeId);
}

export function ScenarioRunPanel({
  flow,
  playback,
  onRun,
  onPause,
  onResume,
  onNextStep,
  onRestart,
}: ScenarioRunPanelProps) {
  const trace = playback?.result.trace ?? null;
  const lastStep = (trace?.nodeIds.length ?? 0) - 1;
  const finished = playback !== null && playback.stepIndex >= lastStep;
  const currentNodeId = playback === null || playback.stepIndex < 0
    ? null
    : trace?.nodeIds[playback.stepIndex] ?? null;

  return (
    <section className="mt-6 border-t border-border pt-5" aria-labelledby="scenario-run-heading">
      <h3 id="scenario-run-heading" className="text-ui font-medium">Run</h3>
      <p className="mt-1 text-xs text-muted">
        Simulates this Flow. No browser actions or HTTP requests are made.
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Run controls">
        <Button onClick={onRun}>{playback === null ? 'Run scenario' : 'Run again'}</Button>
        {playback !== null && (
          <Button
            variant="secondary"
            onClick={finished ? onRestart : playback.isPlaying ? onPause : onResume}
          >
            {finished ? 'Restart' : playback.isPlaying ? 'Pause' : 'Resume'}
          </Button>
        )}
        {playback !== null && !playback.isPlaying && !finished && (
          <Button variant="secondary" onClick={onNextStep}>Next step</Button>
        )}
        {playback !== null && !finished && (
          <Button variant="secondary" onClick={onRestart}>Restart</Button>
        )}
      </div>

      {playback !== null && (
        <div className="mt-4">
          <p className={`rounded-control border px-3 py-2 text-xs ${finished && playback.result.status === 'stopped' ? 'border-danger-border bg-danger-hover text-danger' : 'border-brand-border bg-brand-soft text-brand'}`} role="status" aria-live="polite">
            {!finished
              ? `Step ${playback.stepIndex + 1} of ${trace?.nodeIds.length}: ${currentNodeId === null ? '' : nodeLabel(flow, currentNodeId)}`
              : playback.result.status === 'completed'
                ? `Completed at ${nodeLabel(flow, playback.result.terminalNodeId)}.`
                : `Stopped: ${stopMessage(playback.result.reason, flow)}`}
          </p>

          {trace !== null && trace.nodeIds.length > 0 && (
            <ol className="mt-3 space-y-2" aria-label="Run trace">
              {trace.nodeIds.slice(0, playback.stepIndex + 1).map((nodeId, index) => {
                const outcome = trace.nodeIds.indexOf(nodeId) === index
                  ? outcomeAt(trace, nodeId)
                  : undefined;
                const traversedEdgeId = trace.edgeIds[index];
                const edge = traversedEdgeId === undefined
                  ? null
                  : flow.edges.find((item) => item.id === traversedEdgeId) ?? null;

                return (
                  <li
                    key={`${index}:${nodeId}`}
                    aria-current={index === playback.stepIndex ? 'step' : undefined}
                    className={`rounded-control border p-3 text-xs ${index === playback.stepIndex ? 'border-brand-border bg-brand-soft' : 'border-border bg-surface'}`}
                  >
                    <p className="font-medium wrap-anywhere">{index + 1}. {nodeLabel(flow, nodeId)}</p>
                    {outcome !== undefined && (
                      <p className="mt-1 text-muted wrap-anywhere">
                        Simulated {outcome.source} · {outcome.outcome.kind}
                        {outcome.outcome.code !== null && ` · ${outcome.outcome.code}`}
                        {outcome.outcome.httpStatus !== null && ` · HTTP ${outcome.outcome.httpStatus}`}
                      </p>
                    )}
                    {edge !== null && index < playback.stepIndex && (
                      <p className="mt-1 text-muted">→ {edge.kind} connection</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

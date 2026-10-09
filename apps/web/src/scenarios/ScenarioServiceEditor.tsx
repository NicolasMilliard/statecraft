import type { FlowNode, ScenarioOverride, ServiceOutcome } from '@statecraft/core';
import { useId, useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextInput } from '../ui/TextInput';

interface ScenarioServiceEditorProps {
  readonly node: FlowNode;
  readonly override: ScenarioOverride | null;
  readonly onChange: (outcome: ServiceOutcome | null) => void;
}

function draftsFromOutcome(outcome: ServiceOutcome | null) {
  return {
    code: outcome?.code ?? '',
    status: outcome?.httpStatus?.toString() ?? '',
  };
}

export function ScenarioServiceEditor({
  node,
  override,
  onChange,
}: ScenarioServiceEditorProps) {
  const id = useId();
  const outcome = override?.outcome ?? null;
  const [previousOutcome, setPreviousOutcome] = useState(outcome);
  const [draft, setDraft] = useState(() => draftsFromOutcome(outcome));

  if (previousOutcome !== outcome) {
    setPreviousOutcome(outcome);
    setDraft(draftsFromOutcome(outcome));
  }

  const statusText = draft.status.trim();
  const statusIsValid = statusText.length === 0 ||
    (/^\d{3}$/.test(statusText) && Number(statusText) >= 100 && Number(statusText) <= 599);
  const normalizedCode = draft.code.trim() || null;
  const normalizedStatus = statusText.length === 0 ? null : Number(statusText);
  const canApply = outcome !== null && statusIsValid &&
    (normalizedCode !== outcome.code || normalizedStatus !== outcome.httpStatus);
  const canCancel = outcome !== null &&
    (draft.code !== (outcome.code ?? '') ||
      draft.status !== (outcome.httpStatus?.toString() ?? ''));

  return (
    <div className="rounded-control border border-border bg-surface p-3">
      <h4 className="text-ui font-medium wrap-anywhere">{node.label}</h4>
      <p className="mt-0.5 font-mono text-xs text-muted wrap-anywhere">{node.id}</p>

      <label htmlFor={`${id}-outcome`} className="mt-3 block text-xs text-muted">
        Simulated outcome
      </label>
      <Select
        id={`${id}-outcome`}
        value={outcome?.kind ?? 'default'}
        onChange={(event) => {
          const value = event.target.value;
          onChange(value === 'default'
            ? null
            : { kind: value as ServiceOutcome['kind'], code: null, httpStatus: null });
        }}
        containerClassName="mt-1"
      >
        <option value="default">Default · success</option>
        <option value="success">Override · success</option>
        <option value="failure">Override · failure</option>
      </Select>

      {outcome === null ? (
        <p className="mt-2 text-xs text-muted">
          Success is assumed for this simulation.
        </p>
      ) : (
        <form
          className="mt-3 space-y-3 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canApply) return;
            onChange({
              kind: outcome.kind,
              code: normalizedCode,
              httpStatus: normalizedStatus,
            });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
              event.preventDefault();
              event.stopPropagation();
              setDraft(draftsFromOutcome(outcome));
            }
          }}
        >
          <div>
            <label htmlFor={`${id}-code`} className="block text-xs text-muted">
              Code · optional
            </label>
            <TextInput
              id={`${id}-code`}
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              placeholder="e.g. PAYMENT_DECLINED"
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor={`${id}-status`} className="block text-xs text-muted">
              HTTP status · optional
            </label>
            <TextInput
              id={`${id}-status`}
              inputMode="numeric"
              value={draft.status}
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
              aria-invalid={!statusIsValid}
              aria-describedby={!statusIsValid ? `${id}-status-error` : undefined}
              placeholder="e.g. 402"
              className="mt-1"
            />
            {!statusIsValid && (
              <p id={`${id}-status-error`} role="alert" className="mt-1 text-xs text-danger">
                Enter a status from 100 to 599.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!canApply}>Apply details</Button>
            <Button
              variant="secondary"
              disabled={!canCancel}
              onClick={() => setDraft(draftsFromOutcome(outcome))}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

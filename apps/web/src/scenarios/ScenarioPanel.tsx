import type { Flow, Scenario, ServiceOutcome } from '@statecraft/core';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextInput } from '../ui/TextInput';
import { ScenarioServiceEditor } from './ScenarioServiceEditor';

interface ScenarioPanelProps {
  readonly flow: Flow;
  readonly scenarios: readonly Scenario[];
  readonly selectedScenario: Scenario | null;
  readonly focusNameScenarioId: string | null;
  readonly onNameFocusHandled: () => void;
  readonly onSelect: (scenarioId: string) => void;
  readonly onCreate: () => void;
  readonly onDuplicate: (scenarioId: string) => void;
  readonly onRename: (scenarioId: string, name: string) => void;
  readonly onDelete: (scenarioId: string) => void;
  readonly onOverrideChange: (
    scenarioId: string,
    flowNodeId: string,
    outcome: ServiceOutcome | null,
  ) => void;
}

function ScenarioNameEditor({
  scenario,
  onRename,
  focusOnMount,
  onFocusHandled,
}: {
  scenario: Scenario;
  onRename: (scenarioId: string, name: string) => void;
  focusOnMount: boolean;
  onFocusHandled: () => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previousName, setPreviousName] = useState(scenario.name);
  const [draftName, setDraftName] = useState(scenario.name);

  if (previousName !== scenario.name) {
    setPreviousName(scenario.name);
    setDraftName(scenario.name);
  }

  useLayoutEffect(() => {
    if (!focusOnMount) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    onFocusHandled();
  }, [focusOnMount, onFocusHandled]);

  const normalizedName = draftName.trim();
  const isValid = normalizedName.length > 0;
  const canApply = isValid && normalizedName !== scenario.name;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canApply) onRename(scenario.id, normalizedName);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          event.stopPropagation();
          setDraftName(scenario.name);
        }
      }}
    >
      <label htmlFor={id} className="block text-ui font-medium">Name</label>
      <TextInput
        ref={inputRef}
        id={id}
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        aria-invalid={!isValid}
        aria-describedby={!isValid ? `${id}-error` : undefined}
        className="mt-2"
      />
      {!isValid && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          Name cannot be empty.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <Button type="submit" disabled={!canApply}>Apply name</Button>
        <Button
          variant="secondary"
          disabled={draftName === scenario.name}
          onClick={() => setDraftName(scenario.name)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ScenarioPanel({
  flow,
  scenarios,
  selectedScenario,
  focusNameScenarioId,
  onNameFocusHandled,
  onSelect,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onOverrideChange,
}: ScenarioPanelProps) {
  const id = useId();
  const serviceNodes = flow.nodes.filter((node) => node.kind === 'service');

  return (
    <InspectorPanel
      title="Scenarios"
      context={`${scenarios.length} ${scenarios.length === 1 ? 'scenario' : 'scenarios'}`}
    >
      <p className="text-ui text-muted">
        Explore alternative Service outcomes in this flow.
      </p>

      {scenarios.length === 0 ? (
        <div className="mt-5 rounded-control border border-border bg-surface p-4">
          <h3 className="text-ui font-medium">Create a scenario</h3>
          <p className="mt-2 text-xs text-muted">
            Each scenario can override the outcome of any Service.
          </p>
          <Button onClick={onCreate} className="mt-4">New scenario</Button>
        </div>
      ) : selectedScenario !== null && (
        <>
          <label htmlFor={`${id}-select`} className="mt-5 block text-ui font-medium">
            Scenario
          </label>
          <Select
            id={`${id}-select`}
            value={selectedScenario.id}
            onChange={(event) => onSelect(event.target.value)}
            containerClassName="mt-2"
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
            ))}
          </Select>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={onCreate}>New</Button>
            <Button variant="secondary" onClick={() => onDuplicate(selectedScenario.id)}>
              Duplicate
            </Button>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <ScenarioNameEditor
              key={selectedScenario.id}
              scenario={selectedScenario}
              onRename={onRename}
              focusOnMount={focusNameScenarioId === selectedScenario.id}
              onFocusHandled={onNameFocusHandled}
            />
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-ui font-medium">Service outcomes</h3>
            <p className="mt-1 text-xs text-muted">
              Outcomes here are simulated. They do not call the service.
            </p>
            {serviceNodes.length === 0 ? (
              <p className="mt-4 text-ui text-muted">
                Add a Service node to define an outcome.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {serviceNodes.map((node) => (
                  <ScenarioServiceEditor
                    key={`${selectedScenario.id}:${node.id}`}
                    node={node}
                    override={selectedScenario.overrides.find(
                      (override) => override.flowNodeId === node.id,
                    ) ?? null}
                    onChange={(outcome) => onOverrideChange(
                      selectedScenario.id,
                      node.id,
                      outcome,
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <Button
              variant="danger"
              onClick={() => onDelete(selectedScenario.id)}
              title="Delete this scenario. Use Undo to restore it."
            >
              Delete scenario
            </Button>
          </div>
        </>
      )}
    </InspectorPanel>
  );
}

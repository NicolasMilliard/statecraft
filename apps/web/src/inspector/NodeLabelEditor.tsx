import type { FlowNode } from '@statecraft/core';
import { useId, useState } from 'react';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';

interface NodeLabelEditorProps {
  readonly node: FlowNode;
  readonly onRename: (nodeId: string, label: string) => void;
}

export function NodeLabelEditor({ node, onRename }: NodeLabelEditorProps) {
  const inputId = useId();
  const [draftLabel, setDraftLabel] = useState(node.label);
  const [previousLabel, setPreviousLabel] = useState(node.label);

  if (previousLabel !== node.label) {
    setPreviousLabel(node.label);
    setDraftLabel(node.label);
  }

  const normalizedLabel = draftLabel.trim();
  const isValid = normalizedLabel.length > 0;
  const canApply = isValid && normalizedLabel !== node.label;
  const canCancel = draftLabel !== node.label;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (!canApply) {
          return;
        }

        onRename(node.id, normalizedLabel);
        setDraftLabel(normalizedLabel);
      }}
    >
      <label
        htmlFor={inputId}
        className="block text-ui font-medium text-foreground"
      >
        Label
      </label>

      <TextInput
        id={inputId}
        name="label"
        autoComplete="off"
        value={draftLabel}
        onChange={(event) => setDraftLabel(event.target.value)}
        aria-invalid={!isValid}
        aria-describedby={!isValid ? `${inputId}-error` : undefined}
        className="mt-2"
      />

      {!isValid && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-2 text-ui text-danger"
        >
          Label cannot be empty.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={!canApply}>
          Apply
        </Button>

        <Button
          variant="secondary"
          disabled={!canCancel}
          onClick={() => setDraftLabel(node.label)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

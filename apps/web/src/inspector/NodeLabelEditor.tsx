import type { FlowNode } from '@statecraft/core';
import { useId, useState } from 'react';

interface NodeLabelEditorProps {
  readonly node: FlowNode;
  readonly onRename: (nodeId: string, label: string) => void;
}

export function NodeLabelEditor({ node, onRename }: NodeLabelEditorProps) {
  const inputId = useId();
  const [draftLabel, setDraftLabel] = useState(node.label);

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
        className="block text-sm font-medium text-slate-700"
      >
        Label
      </label>

      <input
        id={inputId}
        name="label"
        type="text"
        autoComplete="off"
        value={draftLabel}
        onChange={(event) => setDraftLabel(event.target.value)}
        aria-invalid={!isValid}
        aria-describedby={!isValid ? `${inputId}-error` : undefined}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />

      {!isValid && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-2 text-sm text-red-700"
        >
          Label cannot be empty.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={!canApply}
          className="cursor-pointer rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>

        <button
          type="button"
          disabled={!canCancel}
          onClick={() => setDraftLabel(node.label)}
          className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

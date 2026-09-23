import { useId, useState } from 'react';

interface FlowNameEditorProps {
  readonly name: string;
  readonly onRename: (name: string) => void;
}

export function FlowNameEditor({ name, onRename }: FlowNameEditorProps) {
  const inputId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);

  const normalizedName = draftName.trim();
  const isValid = normalizedName.length > 0;
  const canApply = isValid && normalizedName !== name;

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold wrap-anywhere">{name}</h1>

        <button
          type="button"
          aria-label="Rename flow"
          onClick={() => {
            setDraftName(name);
            setIsEditing(true);
          }}
          className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Rename
        </button>
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();

        if (!canApply) {
          return;
        }

        onRename(normalizedName);
        setIsEditing(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setIsEditing(false);
        }
      }}
    >
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700"
      >
        Flow name
      </label>

      <input
        id={inputId}
        name="flowName"
        type="text"
        autoComplete="off"
        autoFocus
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
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
          Name cannot be empty.
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
          onClick={() => setIsEditing(false)}
          className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import { useId, useState } from 'react';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';

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

        <Button
          variant="secondary"
          aria-label="Rename flow"
          onClick={() => {
            setDraftName(name);
            setIsEditing(true);
          }}
        >
          Rename
        </Button>
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
        className="block text-ui font-medium text-foreground"
      >
        Flow name
      </label>

      <TextInput
        id={inputId}
        name="flowName"
        autoComplete="off"
        autoFocus
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
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
          Name cannot be empty.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={!canApply}>
          Apply
        </Button>

        <Button variant="secondary" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

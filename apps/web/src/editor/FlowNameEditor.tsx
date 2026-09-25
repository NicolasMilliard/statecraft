import { useId, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { CommandButton } from './CommandButton';
import type { EditorCommand, ShortcutPlatform } from './commands';

interface FlowNameEditorProps {
  readonly ref?: Ref<HTMLInputElement>;
  readonly command: EditorCommand;
  readonly platform: ShortcutPlatform;
  readonly name: string;
  readonly isEditing: boolean;
  readonly onRename: (name: string) => void;
  readonly onClose: () => void;
}

export function FlowNameEditor({ ref, command, platform, name, isEditing, onRename, onClose }: FlowNameEditorProps) {
  const inputId = useId();
  const [draftName, setDraftName] = useState(name);
  const [previousName, setPreviousName] = useState(name);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  // Keep the draft in sync with history and imports without remounting the input.
  if (previousName !== name) {
    setPreviousName(name);
    setDraftName(name);
  }

  useLayoutEffect(() => {
    if (!isEditing && restoreFocus.current) {
      restoreFocus.current = false;
      buttonRef.current?.focus();
    }
  }, [isEditing]);

  function closeEditor() {
    restoreFocus.current = true;
    setDraftName(name);
    onClose();
  }

  const normalizedName = draftName.trim();
  const isValid = normalizedName.length > 0;
  const canApply = isValid && normalizedName !== name;

  if (!isEditing) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-ui font-medium" title={name}>
          {name}
        </h1>

        <CommandButton
          ref={buttonRef}
          command={command}
          platform={platform}
          variant="secondary"
          aria-label="Rename flow"
          className="shrink-0"
        >
          Rename
        </CommandButton>
      </div>
    );
  }

  return (
    <form
      className="min-w-0 flex-1 basis-64"
      onSubmit={(event) => {
        event.preventDefault();

        if (!canApply) {
          return;
        }

        onRename(normalizedName);
        closeEditor();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          event.stopPropagation();
          closeEditor();
        }
      }}
    >
      <h1 className="sr-only">{name}</h1>
      <label htmlFor={inputId} className="sr-only">
        Flow name
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          ref={ref}
          id={inputId}
          name="flowName"
          autoComplete="off"
          autoFocus
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          aria-invalid={!isValid}
          aria-describedby={!isValid ? `${inputId}-error` : undefined}
          className="flex-1 basis-32"
        />

        <Button type="submit" disabled={!canApply}>
          Apply
        </Button>

        <Button variant="secondary" onClick={closeEditor}>
          Cancel
        </Button>
      </div>

      {!isValid && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-2 text-ui text-danger"
        >
          Name cannot be empty.
        </p>
      )}
    </form>
  );
}

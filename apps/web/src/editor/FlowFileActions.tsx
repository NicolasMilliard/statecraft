import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { CommandButton } from './CommandButton';
import type { EditorCommand, ShortcutPlatform } from './commands';

export interface FlowFileActionsHandle {
  open: () => void;
  export: () => void;
}

interface FlowFileActionsProps {
  readonly ref?: Ref<FlowFileActionsHandle>;
  readonly openCommand: EditorCommand;
  readonly exportCommand: EditorCommand;
  readonly platform: ShortcutPlatform;
  readonly flowName: string;
  readonly onExport: () => string;
  readonly onRestore: (serialized: string) => boolean;
  readonly isRestoring: boolean;
  readonly onRestoringChange: (isRestoring: boolean) => void;
}

export function FlowFileActions({
  ref,
  openCommand,
  exportCommand,
  platform,
  flowName,
  onExport,
  onRestore,
  isRestoring,
  onRestoringChange,
}: FlowFileActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);

    try {
      const serialized = onExport();
      const blob = new Blob([serialized], {
        type: 'application/json;charset=utf-8',
      });

      const baseName =
        flowName.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') ||
        'flow';

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      try {
        link.href = url;
        link.download = `${baseName}.statecraft.json`;
        link.hidden = true;

        document.body.append(link);
        link.click();
      } finally {
        link.remove();

        // Allow the browser to start consuming the download URL.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setError('Could not export this flow. Please try again.');
    }
  }

  useImperativeHandle(ref, () => ({
    open: () => inputRef.current?.click(),
    export: handleExport,
  }));

  async function handleRestore(file: File) {
    onRestoringChange(true);
    setError(null);

    try {
      const serialized = await file.text();

      if (!onRestore(serialized)) {
        setError('Open failed. Choose a valid Statecraft JSON file.');
      }
    } catch {
      setError('Could not read this file. Please try again.');
    } finally {
      onRestoringChange(false);
    }
  }

  return (
    <div
      role="group"
      aria-label="Flow files"
      className="flex flex-wrap items-center gap-2"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        disabled={isRestoring}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          // Allow choosing the same file again.
          event.currentTarget.value = '';

          if (file !== undefined) {
            void handleRestore(file);
          }
        }}
      />

      <CommandButton
        command={exportCommand}
        platform={platform}
        variant="secondary"
      >
        Export JSON
      </CommandButton>

      <CommandButton
        command={openCommand}
        platform={platform}
        variant="secondary"
        title="Open a Statecraft flow. This can be undone."
      >
        {isRestoring ? 'Opening…' : 'Open JSON'}
      </CommandButton>

      {error !== null && (
        <p role="alert" className="w-full text-ui text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

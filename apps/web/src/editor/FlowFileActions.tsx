import { useRef, useState } from 'react';
import { Button } from '../ui/Button';

interface FlowFileActionsProps {
  readonly flowName: string;
  readonly onExport: () => string;
  readonly onRestore: (serialized: string) => boolean;
  readonly isRestoring: boolean;
  readonly onRestoringChange: (isRestoring: boolean) => void;
}

export function FlowFileActions({
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

      <Button
        variant="secondary"
        onClick={handleExport}
        disabled={isRestoring}
      >
        Export JSON
      </Button>

      <Button
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={isRestoring}
        title="Open a Statecraft flow. This can be undone."
      >
        {isRestoring ? 'Opening…' : 'Open JSON'}
      </Button>

      {error !== null && (
        <p role="alert" className="w-full text-ui text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

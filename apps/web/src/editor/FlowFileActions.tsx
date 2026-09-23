import { useRef, useState } from 'react';

interface FlowFileActionsProps {
  readonly flowName: string;
  readonly onExport: () => string;
  readonly onRestore: (serialized: string) => boolean;
}

export function FlowFileActions({
  flowName,
  onExport,
  onRestore,
}: FlowFileActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
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
    setIsRestoring(true);
    setError(null);

    try {
      const serialized = await file.text();

      if (!onRestore(serialized)) {
        setError(
          'Restore failed. Choose a valid Statecraft JSON file ' +
            'for the open flow.',
        );
      }
    } catch {
      setError('Could not read this file. Please try again.');
    } finally {
      setIsRestoring(false);
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

      <button
        type="button"
        onClick={handleExport}
        disabled={isRestoring}
        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export JSON
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isRestoring}
        title="Restore a version of this flow. This can be undone."
        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRestoring ? 'Restoring…' : 'Restore JSON'}
      </button>

      {error !== null && (
        <p role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

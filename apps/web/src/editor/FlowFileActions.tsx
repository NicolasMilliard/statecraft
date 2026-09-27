import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { toast } from 'sonner';
import { CommandButton } from './CommandButton';
import type { EditorCommand, ShortcutPlatform } from './commands';
import { toastMessage } from './toast-message';

export interface FlowFileActionsHandle {
  open: () => void;
  export: () => void;
}

const FILE_ERROR_TOAST = 'flow-file-error';
const FILE_SUCCESS_TOAST = 'flow-file-success';

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
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => { toast.dismiss(FILE_ERROR_TOAST); }, []);

  function showError(action: 'open' | 'export', title: string, description: string) {
    toast.error(toastMessage(FILE_ERROR_TOAST, title), {
      id: FILE_ERROR_TOAST,
      description,
      duration: Infinity,
      action: {
        label: action === 'open' ? 'Choose file' : 'Retry export',
        onClick: (event) => {
          event.preventDefault();
          // Use the live controls so retry never exports an older render's flow.
          if (action === 'open') inputRef.current?.click();
          else exportButtonRef.current?.click();
        },
      },
    });
  }

  function handleExport() {
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
      toast.dismiss(FILE_ERROR_TOAST);
      toast.success(toastMessage(FILE_SUCCESS_TOAST, 'Download started'), {
        id: FILE_SUCCESS_TOAST,
        description: `${baseName}.statecraft.json`,
      });
    } catch {
      showError('export', 'The download could not be started', 'Your flow is still open. Try exporting it again.');
    }
  }

  useImperativeHandle(ref, () => ({
    open: () => inputRef.current?.click(),
    export: handleExport,
  }));

  async function handleRestore(file: File) {
    onRestoringChange(true);

    try {
      const serialized = await file.text();

      if (!onRestore(serialized)) {
        showError('open', `Could not open “${file.name}”`, 'Choose a supported JSON file exported from Statecraft. Your current flow is unchanged.');
      } else {
        toast.dismiss(FILE_ERROR_TOAST);
        toast.success(toastMessage(FILE_SUCCESS_TOAST, 'Flow opened'), { id: FILE_SUCCESS_TOAST, description: file.name });
      }
    } catch {
      showError('open', `Could not read “${file.name}”`, 'Check that the file is available, then choose it again. Your current flow is unchanged.');
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
        ref={exportButtonRef}
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
        title=""
      >
        {isRestoring ? 'Opening…' : 'Open JSON'}
      </CommandButton>
    </div>
  );
}

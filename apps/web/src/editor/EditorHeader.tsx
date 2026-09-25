import type { ReactNode, Ref } from 'react';
import { CommandButton } from './CommandButton';
import type { CommandRegistry, ShortcutPlatform } from './commands';

interface EditorHeaderProps {
  readonly nameEditor: ReactNode;
  readonly fileActions: ReactNode;
  readonly commands: Pick<CommandRegistry, 'new-flow' | 'save' | 'commands'>;
  readonly platform: ShortcutPlatform;
  readonly hasUnsavedChanges: boolean;
  readonly willReplaceInvalidDraft: boolean;
  readonly storageError: string | null;
  readonly paletteOpen: boolean;
  readonly commandsButtonRef: Ref<HTMLButtonElement>;
}

export function EditorHeader({
  nameEditor,
  fileActions,
  commands,
  platform,
  hasUnsavedChanges,
  willReplaceInvalidDraft,
  storageError,
  paletteOpen,
  commandsButtonRef,
}: EditorHeaderProps) {
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-chrome px-4 py-3 lg:px-5">
      <div className="flex min-w-0 flex-1 basis-80 items-center gap-3">
        <p className="shrink-0 text-sm font-semibold tracking-tight">statecraft</p>
        <span aria-hidden="true" className="text-border-strong">/</span>
        {nameEditor}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p role="status" className="mr-2 text-xs text-muted">
          {hasUnsavedChanges ? 'Unsaved changes' : 'Saved locally'}
        </p>
        <CommandButton
          command={commands['new-flow']}
          platform={platform}
          variant="secondary"
          title="Create an empty flow. This can be undone."
        >
          New flow
        </CommandButton>
        {fileActions}
        <CommandButton command={commands.save} platform={platform}>
          {willReplaceInvalidDraft ? 'Replace local copy' : 'Save'}
        </CommandButton>
        <CommandButton
          ref={commandsButtonRef}
          command={commands.commands}
          platform={platform}
          variant="secondary"
          showShortcut
          aria-haspopup="dialog"
          aria-expanded={paletteOpen}
        />
      </div>

      {storageError !== null && (
        <p role="alert" className="w-full text-ui text-danger">{storageError}</p>
      )}
    </header>
  );
}

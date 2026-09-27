import type { ReactNode, Ref } from 'react';
import { CommandButton } from './CommandButton';
import type { CommandRegistry, ShortcutPlatform } from './commands';
import { EditorNotice } from './EditorNotice';
import { SaveStatus } from './SaveStatus';
import { STORAGE_FEEDBACK, type StorageIssue } from './storage-feedback';

interface EditorHeaderProps {
  readonly nameEditor: ReactNode;
  readonly fileActions: ReactNode;
  readonly commands: Pick<CommandRegistry, 'new-flow' | 'save' | 'commands' | 'export-json'>;
  readonly platform: ShortcutPlatform;
  readonly hasUnsavedChanges: boolean;
  readonly willReplaceInvalidDraft: boolean;
  readonly storageIssue: StorageIssue | null;
  readonly isRestoring: boolean;
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
  storageIssue,
  isRestoring,
  paletteOpen,
  commandsButtonRef,
}: EditorHeaderProps) {
  const storageFeedback = willReplaceInvalidDraft ? STORAGE_FEEDBACK['invalid-draft']
    : storageIssue === 'unavailable' ? STORAGE_FEEDBACK.unavailable : null;

  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-chrome px-4 py-3 lg:px-5">
      <div className="flex min-w-0 flex-1 basis-80 items-center gap-3">
        <p className="shrink-0 text-sm font-semibold tracking-tight">statecraft</p>
        <span aria-hidden="true" className="text-border-strong">/</span>
        {nameEditor}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <SaveStatus hasUnsavedChanges={hasUnsavedChanges} hasStorageIssue={storageIssue !== null} isRestoring={isRestoring} />
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
          {willReplaceInvalidDraft ? 'Replace local copy' : storageIssue === 'save-failed' ? 'Retry save' : 'Save'}
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

      {storageFeedback !== null && (
        <EditorNotice title={storageFeedback.title} detail={storageFeedback.detail}>
          <CommandButton command={commands['export-json']} platform={platform} variant="secondary">
            Export current flow
          </CommandButton>
          <CommandButton command={commands.save} platform={platform} variant="secondary">
            {willReplaceInvalidDraft ? 'Replace local copy' : storageIssue === 'save-failed' ? 'Retry save' : 'Save locally'}
          </CommandButton>
        </EditorNotice>
      )}
    </header>
  );
}

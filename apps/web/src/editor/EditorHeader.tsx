import type { ReactNode, Ref } from "react";

import { StatecraftMark } from "../ui/StatecraftMark";
import { CommandButton } from "./CommandButton";
import type { CommandRegistry, ShortcutPlatform } from "./commands";
import { EditorNotice } from "./EditorNotice";
import { SaveStatus } from "./SaveStatus";
import { STORAGE_FEEDBACK } from "./storage-feedback";
import type { StorageIssue } from "./storage-feedback";

interface EditorHeaderProps {
  readonly nameEditor: ReactNode;
  readonly fileActions: ReactNode;
  readonly commands: Pick<
    CommandRegistry,
    "new-flow" | "save" | "commands" | "export-json"
  >;
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
  function getStorageFeedback() {
    if (willReplaceInvalidDraft) {
      return STORAGE_FEEDBACK["invalid-draft"];
    }
    if (storageIssue === "unavailable") {
      return STORAGE_FEEDBACK.unavailable;
    }
    return null;
  }
  const storageFeedback = getStorageFeedback();

  function getNoticeSaveLabel() {
    if (willReplaceInvalidDraft) {
      return "Replace local copy" as const;
    }
    if (storageIssue === "save-failed") {
      return "Retry save" as const;
    }
    return "Save locally" as const;
  }
  function getSaveLabel() {
    if (willReplaceInvalidDraft) {
      return "Replace local copy" as const;
    }
    if (storageIssue === "save-failed") {
      return "Retry save" as const;
    }
    return "Save" as const;
  }
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-chrome px-4 py-3 lg:px-5">
      <div className="flex min-w-0 flex-1 basis-80 items-center gap-3">
        <p className="flex shrink-0 items-center gap-2 text-base font-normal tracking-[-0.035em]">
          <StatecraftMark />
          statecraft
        </p>
        <span aria-hidden="true" className="text-border-strong">
          /
        </span>
        {nameEditor}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <SaveStatus
          hasUnsavedChanges={hasUnsavedChanges}
          hasStorageIssue={storageIssue !== null}
          isRestoring={isRestoring}
        />
        <CommandButton
          command={commands["new-flow"]}
          platform={platform}
          variant="secondary"
          title="Create an empty flow. Save the current flow first to keep it in your workspace."
        >
          New flow
        </CommandButton>
        {fileActions}
        <CommandButton command={commands.save} platform={platform}>
          {getSaveLabel()}
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
        <EditorNotice
          title={storageFeedback.title}
          detail={storageFeedback.detail}
        >
          <CommandButton
            command={commands["export-json"]}
            platform={platform}
            variant="secondary"
          >
            Export current flow
          </CommandButton>
          <CommandButton
            command={commands.save}
            platform={platform}
            variant="secondary"
          >
            {getNoticeSaveLabel()}
          </CommandButton>
        </EditorNotice>
      )}
    </header>
  );
}

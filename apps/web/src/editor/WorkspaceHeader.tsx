import type { RefObject } from 'react';
import type { CommandRegistry, ShortcutPlatform } from './commands';
import { EditorHeader } from './EditorHeader';
import { FlowFileActions, type FileOpenSource, type FlowFileActionsHandle } from './FlowFileActions';
import { FlowNameEditor } from './FlowNameEditor';
import type { OpenDocument } from './open-document';
import type { useFlowEditor } from './use-flow-editor';

interface WorkspaceHeaderProps {
  readonly editor: ReturnType<typeof useFlowEditor>;
  readonly commands: CommandRegistry;
  readonly platform: ShortcutPlatform;
  readonly isRestoring: boolean;
  readonly paletteOpen: boolean;
  readonly renamingFlowId: string | null;
  readonly nameInputRef: RefObject<HTMLInputElement | null>;
  readonly filesRef: RefObject<FlowFileActionsHandle | null>;
  readonly commandsButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onRenameClose: () => void;
  readonly onDocumentReady: (fileName: string, document: OpenDocument, source: FileOpenSource) => void;
  readonly onRestoringChange: (isRestoring: boolean) => void;
}

export function WorkspaceHeader({
  editor,
  commands,
  platform,
  isRestoring,
  paletteOpen,
  renamingFlowId,
  nameInputRef,
  filesRef,
  commandsButtonRef,
  onRenameClose,
  onDocumentReady,
  onRestoringChange,
}: WorkspaceHeaderProps) {
  const { flow } = editor;

  return (
    <EditorHeader
      commands={commands}
      platform={platform}
      hasUnsavedChanges={editor.hasUnsavedChanges}
      willReplaceInvalidDraft={editor.willReplaceInvalidDraft}
      storageIssue={editor.storageIssue}
      isRestoring={isRestoring}
      paletteOpen={paletteOpen}
      commandsButtonRef={commandsButtonRef}
      nameEditor={
        <FlowNameEditor
          key={flow.id}
          ref={nameInputRef}
          command={commands['rename-flow']}
          platform={platform}
          name={flow.name}
          isEditing={renamingFlowId === flow.id}
          onRename={editor.renameFlow}
          onClose={onRenameClose}
        />
      }
      fileActions={
        <FlowFileActions
          key={flow.id}
          ref={filesRef}
          openCommand={commands['open-json']}
          exportCommand={commands['export-json']}
          platform={platform}
          flowName={flow.name}
          onExport={editor.exportDocument}
          onDocumentReady={onDocumentReady}
          isRestoring={isRestoring}
          onRestoringChange={onRestoringChange}
        />
      }
    />
  );
}

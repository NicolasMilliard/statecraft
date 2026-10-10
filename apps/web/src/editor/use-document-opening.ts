import type { SnapshotDocument } from '@statecraft/core';
import { useState } from 'react';
import { toast } from 'sonner';
import type { FileOpenSource } from './FlowFileActions';
import type { FlowEditorState } from './flow-editor-state';
import type { OpenDocument } from './open-document';
import { toastMessage } from './toast-message';

interface PendingOpen {
  readonly fileName: string;
  readonly document: OpenDocument;
}

interface DocumentOpeningOptions {
  readonly onFlowOpen: (editor: FlowEditorState) => void;
  readonly importSnapshot: (document: SnapshotDocument) => Promise<void>;
  readonly onSnapshotSaved: () => void;
}

export function useDocumentOpening({
  onFlowOpen,
  importSnapshot,
  onSnapshotSaved,
}: DocumentOpeningOptions) {
  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  async function applyDocument(fileName: string, document: OpenDocument) {
    if (document.kind === 'flow') {
      onFlowOpen(document.editor);
    } else {
      setIsSavingSnapshot(true);
      try {
        await importSnapshot(document.document);
        onSnapshotSaved();
      } catch (error) {
        toast.error('Could not save repository snapshot.', {
          description: `${error instanceof Error ? error.message : 'Check that browser storage is available.'} Your current snapshot is unchanged.`,
        });
        setIsSavingSnapshot(false);
        return;
      }
      setIsSavingSnapshot(false);
    }

    toast.success(toastMessage('flow-file-success', document.kind === 'flow' ? 'Flow opened' : 'Snapshot saved'), {
      id: 'flow-file-success',
      description: fileName,
    });
  }

  function onDocumentReady(fileName: string, document: OpenDocument, source: FileOpenSource) {
    if (source === 'picker') {
      void applyDocument(fileName, document);
    } else {
      setPendingOpen({ fileName, document });
    }
  }

  function confirmPendingOpen() {
    if (pendingOpen === null) return;
    setPendingOpen(null);
    void applyDocument(pendingOpen.fileName, pendingOpen.document);
  }

  return {
    pendingOpen,
    isSavingSnapshot,
    onDocumentReady,
    confirmPendingOpen,
    cancelPendingOpen: () => setPendingOpen(null),
  };
}

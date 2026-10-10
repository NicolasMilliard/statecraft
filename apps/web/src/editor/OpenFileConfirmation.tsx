import type { SnapshotDocument } from '@statecraft/core';
import { useEffect, useId, useRef } from 'react';
import { Button } from '../ui/Button';
import { describeFileOpening } from './describe-file-opening';
import type { OpenDocument } from './open-document';

interface OpenFileConfirmationProps {
  readonly fileName: string;
  readonly document: OpenDocument;
  readonly currentFlowName: string;
  readonly hasUnsavedChanges: boolean;
  readonly currentSnapshot: SnapshotDocument | null;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function OpenFileConfirmation({
  fileName,
  document,
  currentFlowName,
  hasUnsavedChanges,
  currentSnapshot,
  onConfirm,
  onCancel,
}: OpenFileConfirmationProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const description = describeFileOpening(
    document,
    currentFlowName,
    hasUnsavedChanges,
    currentSnapshot,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => dialog?.close();
  }, []);

  function cancel() {
    dialogRef.current?.close();
    onCancel();
  }

  function confirm() {
    dialogRef.current?.close();
    onConfirm();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-detail`}
      className="command-palette"
      onCancel={(event) => { event.preventDefault(); cancel(); }}
      onClick={(event) => { if (event.target === event.currentTarget) cancel(); }}
    >
      <div className="px-5 pt-5">
        <h2 id={`${id}-title`} className="text-sm font-medium wrap-anywhere">
          {description.title}
        </h2>
        <p className="mt-2 font-mono text-xs text-muted wrap-anywhere">
          {fileName}
        </p>
        <p id={`${id}-detail`} className="mt-4 text-ui text-muted wrap-anywhere">
          {description.detail}
        </p>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button ref={cancelRef} variant="secondary" onClick={cancel}>Cancel</Button>
        <Button onClick={confirm}>{description.confirmLabel}</Button>
      </div>
    </dialog>
  );
}

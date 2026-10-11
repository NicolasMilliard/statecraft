import { useEffect, useId, useRef } from 'react';
import { Button } from '../ui/Button';

interface FlowSwitchConfirmationProps {
  readonly currentFlowName: string;
  readonly title: string;
  readonly onCancel: () => void;
  readonly onDiscard: () => void;
  readonly onSaveAndContinue: () => void;
}

export function FlowSwitchConfirmation({
  currentFlowName,
  title,
  onCancel,
  onDiscard,
  onSaveAndContinue,
}: FlowSwitchConfirmationProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();

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
          {title}
        </h2>
        <p id={`${id}-detail`} className="mt-4 text-ui text-muted wrap-anywhere">
          “{currentFlowName}” has unsaved changes. Save it before switching, or discard those changes.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
        <Button ref={cancelRef} variant="secondary" onClick={cancel}>Cancel</Button>
        <Button variant="secondary" onClick={onDiscard}>Discard changes</Button>
        <Button onClick={onSaveAndContinue}>Save and continue</Button>
      </div>
    </dialog>
  );
}

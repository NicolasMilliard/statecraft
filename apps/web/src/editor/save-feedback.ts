import { toast } from 'sonner';
import { toastMessage } from './toast-message';

const SAVE_TOAST = 'flow-save';

export function notifySaveResult(saved: boolean, exportFlow: () => void) {
  if (saved) {
    toast.success(toastMessage(SAVE_TOAST, 'Saved locally'), {
      id: SAVE_TOAST,
      description: 'Available in this browser on this device.',
      duration: 4000,
      action: undefined,
    });
  } else {
    toast.error(toastMessage(SAVE_TOAST, 'Your changes could not be saved'), {
      id: SAVE_TOAST,
      description: 'Your edits stay in this tab. Retry Save, or export a copy before closing.',
      duration: Infinity,
      action: { label: 'Export JSON', onClick: exportFlow },
    });
  }
}

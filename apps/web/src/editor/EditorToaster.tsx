import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { toast, Toaster } from 'sonner';

function dismissClickedToast(event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
  if (!(event.target instanceof Element) || event.defaultPrevented) return;
  if (event.target.closest('button, a, input, select, textarea, [role="button"]')) return;

  const notification = event.target.closest<HTMLElement>('[data-sonner-toast]');
  if (!notification || notification.dataset.dismissible === 'false') return;

  const id = notification.querySelector<HTMLElement>('[data-toast-id]')?.dataset.toastId;
  if (id) {
    event.preventDefault();
    toast.dismiss(id);
  }
}

export function EditorToaster() {
  return (
    <div
      data-editor-notifications
      onClick={dismissClickedToast}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
          dismissClickedToast(event);
        }
      }}
    >
      <Toaster
        theme="light"
        position="bottom-right"
        offset={{ bottom: 64, right: 16 }}
        mobileOffset={16}
        visibleToasts={3}
        closeButton
        style={{
          fontFamily: 'inherit',
          '--normal-bg': 'var(--color-surface)',
          '--normal-text': 'var(--color-foreground)',
          '--normal-border': 'var(--color-border)',
          '--border-radius': 'var(--radius-control)',
        } as CSSProperties}
        toastOptions={{
          duration: 4000,
          closeButtonAriaLabel: 'Dismiss notification',
          classNames: {
            toast: 'cursor-pointer',
            description: 'text-muted!',
            closeButton: 'pointer-events-none opacity-0! focus-visible:pointer-events-auto focus-visible:opacity-100! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          },
          actionButtonStyle: {
            minHeight: 32,
            background: 'var(--color-surface-hover)',
            color: 'var(--color-foreground)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-control)',
          },
        }}
      />
    </div>
  );
}

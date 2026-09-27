import type { ReactNode } from 'react';

interface EditorNoticeProps {
  readonly title: string;
  readonly detail: string;
  readonly children: ReactNode;
}

export function EditorNotice({ title, detail, children }: EditorNoticeProps) {
  return (
    <div role="alert" className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-control border border-danger-border bg-surface px-3 py-3">
      <div className="flex min-w-0 flex-1 basis-80 items-start gap-2.5">
        <svg className="mt-0.5 shrink-0 text-danger" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 4h.01" />
        </svg>
        <div className="min-w-0 text-ui">
          <p className="font-medium wrap-anywhere">{title}</p>
          <p className="mt-1 text-muted wrap-anywhere">{detail}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

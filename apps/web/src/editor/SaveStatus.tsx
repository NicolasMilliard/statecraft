interface SaveStatusProps {
  readonly hasUnsavedChanges: boolean;
  readonly hasStorageIssue: boolean;
  readonly isRestoring: boolean;
}

export function SaveStatus({ hasUnsavedChanges, hasStorageIssue, isRestoring }: SaveStatusProps) {
  const isSaved = !hasUnsavedChanges && !hasStorageIssue;
  const label = isRestoring ? 'Opening file…' : hasStorageIssue ? 'Local save issue' : isSaved ? 'Saved locally' : 'Unsaved changes';
  const hint = isRestoring
    ? 'Your current flow stays open until the file has been validated.'
    : hasStorageIssue
      ? 'Local storage needs attention. Export JSON to keep a copy of the open flow.'
      : isSaved
        ? 'Saved in this browser on this device. Export JSON to keep a portable copy.'
        : 'Changes stay in this tab until you save. Opening a JSON file does not save it locally.';

  return (
    <p role="status" aria-atomic="true" title={hint} className={`mr-2 inline-flex min-w-32 items-center gap-1.5 text-xs ${hasStorageIssue ? 'text-danger' : 'text-muted'}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        {isRestoring ? <path d="M5 12h.01M12 12h.01M19 12h.01" />
          : hasStorageIssue ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></>
            : isSaved ? <path d="m5 12 4 4L19 6" />
              : <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />}
      </svg>
      {label}
    </p>
  );
}

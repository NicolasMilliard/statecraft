interface SaveStatusProps {
  readonly hasUnsavedChanges: boolean;
  readonly hasStorageIssue: boolean;
  readonly isRestoring: boolean;
}

export function SaveStatus({
  hasUnsavedChanges,
  hasStorageIssue,
  isRestoring,
}: SaveStatusProps) {
  const isSaved = !hasUnsavedChanges && !hasStorageIssue;
  function getSaveLabel() {
    if (isRestoring) {
      return "Opening file…" as const;
    }
    if (hasStorageIssue) {
      return "Local save issue" as const;
    }
    if (isSaved) {
      return "Saved locally" as const;
    }
    return "Unsaved changes" as const;
  }
  const label = getSaveLabel();
  function getSaveHint() {
    if (isRestoring) {
      return "Your current flow stays open until the file has been validated." as const;
    }
    if (hasStorageIssue) {
      return "Local storage needs attention. Export JSON to keep a copy of the open flow." as const;
    }
    if (isSaved) {
      return "Saved in this browser on this device. Export JSON to keep a portable copy." as const;
    }
    return "Changes stay in this tab until you save. Opening a JSON file does not save it locally." as const;
  }
  const hint = getSaveHint();

  function renderSaveIcon() {
    if (isRestoring) {
      return <path d="M5 12h.01M12 12h.01M19 12h.01" />;
    }
    if (hasStorageIssue) {
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 4h.01" />
        </>
      );
    }
    if (isSaved) {
      return <path d="m5 12 4 4L19 6" />;
    }
    return <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />;
  }
  return (
    <p
      role="status"
      aria-atomic="true"
      title={hint}
      className={`mr-2 inline-flex min-w-32 items-center gap-1.5 text-xs ${hasStorageIssue ? "text-danger" : "text-muted"}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        {renderSaveIcon()}
      </svg>
      {label}
    </p>
  );
}

export type StorageIssue = 'invalid-draft' | 'unavailable' | 'save-failed';

export const STORAGE_FEEDBACK: Record<Exclude<StorageIssue, 'save-failed'>, { readonly title: string; readonly detail: string }> = {
  'invalid-draft': {
    title: 'The saved copy could not be opened',
    detail: 'It is invalid or uses an unsupported format. Replace local copy will overwrite it with the open flow.',
  },
  unavailable: {
    title: 'Local storage could not be read',
    detail: 'Your edits stay in this tab. Export JSON to keep a copy. Saving may replace an existing local copy.',
  },
};

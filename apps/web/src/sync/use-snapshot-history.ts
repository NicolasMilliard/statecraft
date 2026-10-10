import type { SnapshotDocument } from '@statecraft/core';
import { useEffect, useState } from 'react';
import { loadSnapshotDocuments, saveSnapshotDocument } from './snapshot-storage';

function newestFirst(left: SnapshotDocument, right: SnapshotDocument): number {
  return right.snapshot.capturedAt.localeCompare(left.snapshot.capturedAt) ||
    left.snapshot.id.localeCompare(right.snapshot.id);
}

function mergeDocuments(
  current: readonly SnapshotDocument[],
  incoming: readonly SnapshotDocument[],
): readonly SnapshotDocument[] {
  const byId = new Map(current.map((document) => [document.snapshot.id, document]));
  for (const document of incoming) {
    if (!byId.has(document.snapshot.id)) byId.set(document.snapshot.id, document);
  }
  return [...byId.values()].sort(newestFirst);
}

export function useSnapshotHistory() {
  const [documents, setDocuments] = useState<readonly SnapshotDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [storageIssue, setStorageIssue] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadSnapshotDocuments().then(
      (stored) => { if (active) setDocuments((current) => mergeDocuments(current, stored)); },
      () => { if (active) setStorageIssue('Could not load saved snapshots.'); },
    );
    return () => { active = false; };
  }, []);

  const current = documents.find((document) => document.snapshot.id === selectedId) ??
    documents[0] ?? null;
  const compatible = current === null ? [] : documents.filter((document) =>
    document.snapshot.id !== current.snapshot.id &&
    document.snapshot.graph.repositoryId === current.snapshot.graph.repositoryId &&
    document.snapshot.analysisProfileId === current.snapshot.analysisProfileId,
  );
  const baseline = compatible.find((document) => document.snapshot.id === baselineId) ??
    compatible[0] ?? null;

  async function importDocument(document: SnapshotDocument): Promise<void> {
    const saved = await saveSnapshotDocument(document);
    const previousId = current?.snapshot.id ?? null;
    setDocuments((existing) => mergeDocuments(existing, [saved]));
    setSelectedId(saved.snapshot.id);
    setBaselineId(previousId === saved.snapshot.id ? baseline?.snapshot.id ?? null : previousId);
    setStorageIssue(null);
  }

  return {
    documents,
    current,
    baseline,
    compatible,
    storageIssue,
    selectCurrent: setSelectedId,
    selectBaseline: setBaselineId,
    importDocument,
  };
}

import { snapshotIdentityInput, type SnapshotDocument } from '@statecraft/core';
import { parseSnapshotDocument } from '../editor/open-document';

const DATABASE_NAME = 'statecraft-snapshots';
const STORE_NAME = 'snapshots';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Snapshot storage failed.'));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('Snapshot storage is unavailable in this browser.');
  }
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'snapshot.id' });
    }
  };
  return requestResult(request);
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Snapshot storage was aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Snapshot storage failed.'));
  });
}

export async function loadSnapshotDocuments(): Promise<readonly SnapshotDocument[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const stored = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as unknown[];
    await transactionDone(transaction);
    return stored.map(parseSnapshotDocument);
  } finally {
    database.close();
  }
}

export async function saveSnapshotDocument(document: SnapshotDocument): Promise<SnapshotDocument> {
  const identity = snapshotIdentityInput(
    document.snapshot.graph,
    document.snapshot.analysisProfileId,
    document.snapshot.git,
    document.diagnostics,
  );
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const id = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (id !== document.snapshot.id) {
    throw new Error('Snapshot ID does not match its metadata.');
  }

  const database = await openDatabase();
  try {
    const read = database.transaction(STORE_NAME, 'readonly');
    const stored = await requestResult(read.objectStore(STORE_NAME).get(document.snapshot.id)) as unknown;
    await transactionDone(read);
    if (stored !== undefined) {
      const existing = parseSnapshotDocument(stored);
      const { capturedAt: _previousCapturedAt, ...previous } = existing.snapshot;
      const { capturedAt: _nextCapturedAt, ...next } = document.snapshot;
      if (JSON.stringify(previous) !== JSON.stringify(next) ||
          JSON.stringify(existing.diagnostics) !== JSON.stringify(document.diagnostics)) {
        throw new Error('A different snapshot already uses this ID.');
      }
      return existing;
    }

    const write = database.transaction(STORE_NAME, 'readwrite');
    write.objectStore(STORE_NAME).add(document);
    await transactionDone(write);
    return document;
  } finally {
    database.close();
  }
}

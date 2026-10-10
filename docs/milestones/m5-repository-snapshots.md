# M5 — Repository snapshots and local sync

Status: completed.

M5 moves structured scanner metadata from a local Git repository into the
browser workspace and compares successive states. The CLI never includes
complete source files in the snapshot document. The app stores imported
snapshots locally in IndexedDB. Remote sync and account authentication are not
part of this milestone.

## Snapshot contract

- `statecraft scan` emits a versioned snapshot document containing a
  `SyncSnapshot` and scan diagnostics. The M2 report envelope is superseded;
  no milestone compatibility mode is kept.
- The snapshot records the Git HEAD SHA and whether tracked or untracked files
  under the selected scan root have changed. Its own output file is excluded
  from that check. A dirty snapshot describes the scanned working tree, not
  the exact commit state. A repository without a HEAD commit cannot produce a
  snapshot.
- The snapshot ID is a SHA-256 digest of repository ID, analysis profile, Git
  state, graph, and diagnostics. Capture time is excluded so repeated scans of
  unchanged metadata share an ID. The CLI checks Git state before and after
  scanning and rejects a changed state.
- Graph IDs and structural hashes retain their `react-ts-v1` rules. A change
  to those rules requires a new analysis profile. Snapshot comparison rejects
  different repository IDs or analysis profiles.

## Browser workflow

- Open a snapshot JSON through the existing file picker or drop it onto the
  app. Validate the complete document before changing active state. A dropped
  file requires confirmation. An imported snapshot is saved before becoming
  current; a storage failure leaves the current snapshot unchanged.
- Retain several snapshots per repository across reloads. The Sync panel lets
  the user choose a current snapshot and a compatible baseline and shows
  added, modified, and removed entities and relations. The current snapshot
  supplies the code graph used by the node inspector for mapping.
- Keep Flow documents, scenarios, CodeReferences, and snapshot history
  separate. M5 reports code graph changes; M6 will apply those changes to
  cross-flow impact and review status.

## Acceptance

- The Checkout fixture produces ten entities and nine relations. A repeated
  scan of the same state has the same snapshot ID.
- A formatting-only change leaves structural hashes and the graph diff
  unchanged. A body change preserves the entity ID and produces a modification;
  an added or removed entity produces the corresponding diff.
- A dirty scan at the same HEAD is visibly distinct from a clean scan. The
  importer rejects malformed snapshots and invalid graphs without replacing
  current work.
- Saved snapshots survive reload, and selecting either snapshot updates the
  mapping graph and comparison. JSON contains metadata and diagnostics, not
  complete source text.
- Repository typecheck, tests, and build pass, followed by a browser check of
  import, comparison, keyboard use, and compact width.

## Verification

Verified on 2026-10-10:

- The CLI produced the ten Checkout entities and nine relations, and repeated
  scans shared an ID. A clean and a dirty scan at the same commit had distinct
  IDs. Writing the output inside the scanned repository did not mark it dirty.
- The browser imported two snapshots, showed a modified `CheckoutPage`, kept
  both snapshots after reload, and switched the current mapping graph when the
  current snapshot changed. An inconsistent snapshot ID was rejected without
  replacing the current snapshot.
- The Sync controls and diff remained accessible at a 390 px viewport without
  page-level horizontal overflow. Repository typecheck, tests, and build passed.

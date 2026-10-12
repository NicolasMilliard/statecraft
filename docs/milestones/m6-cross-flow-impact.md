# M6 — Cross-flow impact and review

Status: completed.

M6 connects local repository snapshot changes to explicit CodeReferences in
saved Flows. It shows which Flows need a person's review and records which
snapshot that person examined. A code change is evidence for review, not proof
that a user journey is broken. M6 does not infer Flow links from names, run the
application, upload source files, or add remote sync.

The Sync panel shows exploratory impacts for its selected **Compare with** pair
across saved Flows, using the active Flow's unsaved mapping as a labeled
preview. This comparison does not establish a review checkpoint. A separate
review section assesses the active Flow against its last explicit checkpoint
and lets the user record the selected current snapshot after saving that Flow.
The Flows panel now assesses every saved Flow against the selected current
snapshot and each Flow's own review checkpoint. Its count includes each saved
Flow needing review once. An active Flow with unsaved changes appears as a
separate preview and does not alter the saved count. A reason can open its Flow
and select the affected node; switching still prompts to save or discard
unsaved work.

## Scope and ownership

- The project view covers every saved Flow in the local workspace, not only the
  Flow currently open on the canvas. The active Flow uses its latest editor
  state for a preview, while recording a review requires a durable Flow save.
- A CodeReference belongs to a Flow node and identifies one code entity in one
  repository. Only explicit references participate in impact analysis. The
  reference's `primary` or `dependency` role is shown as context; both roles
  participate equally.
- Snapshot comparison requires the same repository ID and analysis profile.
  The selected current snapshot determines the repository being assessed.
  Flows may have references to several repositories; review checkpoints and
  statuses are independent for each Flow/repository pair.
- Snapshot history remains in local browser storage, separate from Flow
  documents. Review checkpoints belong to their Flow document so a saved or
  exported Flow preserves the fact of review. Importing that Flow does not
  import the snapshots to which its checkpoints refer.

## Impact rules

1. Compare the selected current snapshot with the snapshot recorded by the
   Flow's last explicit review for the same repository. The Sync panel's
   user-selected **Compare with** snapshot is for exploring changes and never
   becomes a review checkpoint by itself.
2. A changed entity affects a Flow when one of its CodeReferences identifies
   that entity in the compared repository. Added, modified, and removed
   entities are distinct reasons. A removed entity remains visible through its
   unresolved reference; Statecraft never guesses a replacement.
3. A changed relation affects a Flow when a referenced entity is an endpoint
   before or after the change. Added, modified, and removed relations are
   distinct reasons. Show the reference and Flow node that led to each reason.
4. Do not traverse the code graph beyond directly referenced entities and
   their incident relations. Do not infer new Flow edges or affected journeys
   from a code relation. Group repeated reasons in the UI without losing their
   underlying references.
5. Assessment is a deterministic comparison of the two snapshot graphs. An
   intermediate change that has been reverted in the selected current snapshot
   produces no remaining impact. A new snapshot with no further changes does
   not clear an existing impact: the comparison still starts at the last
   explicitly reviewed snapshot.

## Review states

The project view must distinguish these states for each relevant
Flow/repository pair:

| State | Meaning |
| --- | --- |
| No snapshot | There is no selected snapshot for this repository. No assessment is possible. |
| Unmapped | The Flow has no CodeReferences for this repository. It is not counted as up to date or impacted. |
| Unreviewed | The Flow has references but no review checkpoint for them. The user can establish a baseline by reviewing the selected snapshot. |
| Up to date | A checkpoint exists, and the current graph has no directly referenced entity or relation changes relative to it. This does not verify runtime behavior. |
| Needs review | At least one directly referenced entity or incident relation changed since the checkpoint. Show every actionable reason. |
| Unavailable | A checkpoint exists, but its snapshot is missing or incompatible with the current snapshot. Do not present the Flow as up to date or silently clear the checkpoint. |

Opening, importing, or selecting a snapshot only recalculates these states. It
does not record a review. Selecting a historical snapshot may change the
assessment for that selected state, but it does not move the checkpoint. The
interface must identify both snapshot IDs or Git states being compared so this
is clear. Dirty snapshots are valid review targets, with the existing warning
that their graph describes a working tree rather than the exact commit.

Adding, removing, or changing a CodeReference after review requires another
explicit review of that Flow for the affected repository. Show **Unreviewed**
for the changed mapping until then; an old checkpoint must not present newly
mapped code as reviewed. Ordinary layout changes and scenario playback do not
invalidate a code review.

## Recording review

- Provide an explicit **Mark as reviewed** action in the context of one Flow
  and one current repository snapshot. Show the impact reasons before this
  action; reviewing one Flow never acknowledges another Flow.
- Record the Flow ID, repository ID, and exact selected snapshot ID. Persist
  the checkpoint together with the Flow's current references. Replace only the
  checkpoint for that Flow/repository pair; checkpoints for other repositories
  and Flows remain unchanged.
- A failed save leaves the previous checkpoint intact and reports the failure.
  A successful review changes the assessed Flow to **Up to date** for the
  reviewed snapshot. A later change can return it to **Needs review**.
- An **Unavailable** comparison can be resolved by explicitly reviewing the
  current snapshot as a new baseline. Never substitute a different historical
  snapshot automatically.
- Version the Flow document if review checkpoints are added to its schema.
  Existing Flow documents and drafts open without checkpoints. Validate review
  ownership and uniqueness at the document boundary. If an imported Flow has
  a checkpoint whose snapshot is absent locally, show **Unavailable** until
  that snapshot is imported or a new review is recorded.

## Project experience

- Show the count and list of distinct Flows needing review for the selected
  repository, including their names, reasons, and a way to open each Flow and
  locate the affected node. A Flow with several changed references counts once.
- Keep **Unreviewed**, **Unavailable**, and **Unmapped** distinguishable from
  **Up to date** and from **Needs review**; do not fold them into a reassuring
  zero-impact count. Preserve the current Flow's unsaved work when navigating.
- Make review state and actions available with keyboard and pointer. Reason
  text must remain readable at compact widths and when an entity was removed.

## Acceptance

- Two saved Flows referencing the same changed Checkout entity both show
  **Needs review**. A third Flow without a matching reference does not.
  Reviewing one of the two leaves the other pending.
- A change to a relation incident on a referenced entity produces a reason;
  an unrelated relation does not. Removed entities and references stay visible.
- Importing a later unchanged snapshot does not clear a pending review.
  Reimporting or selecting snapshots does not record one. Changing the M5
  **Compare with** selection has no effect on review checkpoints.
- A missing reviewed snapshot, repository mismatch, or analysis profile
  mismatch never appears as **Up to date**. An explicit review can establish a
  new baseline on the current compatible snapshot.
- Review checkpoints survive save and reload. Flow export/import preserves
  them, while missing snapshot history is reported accurately. A mapping edit
  cannot leave newly referenced code marked as reviewed.
- The complete Checkout journey works with keyboard and pointer at compact
  width. Repository typecheck, tests, and build pass.

## Verification

Verified on 2026-10-12:

- The Checkout fixture test covers two saved Flows linked to the changed
  `CheckoutForm` and a third Flow linked to unchanged code. A later snapshot
  with the same changed graph leaves both reviews pending. Reviewing one Flow
  leaves the other pending.
- The same fixture verifies that removing `CheckoutForm` reports its removed
  entity and incident relations through the saved reference, while a change
  to an unrelated relation leaves Checkout up to date. Core and web tests cover
  checkpoint persistence, mapping changes, missing or incompatible snapshots,
  and independent Flow/repository reviews.
- In the browser, the Checkout scenario reached **Order confirmed** with its
  default outcome and **Order error** with a forced failure. The project view
  showed both affected saved Flows and selected the named node after switching.
  At compact width, pointer navigation preserved unsaved edits through the
  confirmation dialog, and Tab then Enter opened an affected node and its
  Inspector. A fresh local session imported the Checkout Flow and a repository
  snapshot.
- Repository typecheck, tests, web lint, and production build passed.

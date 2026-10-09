# M4 — Scenarios and Run

Status: contract, core runner, and versioned Scenario persistence implemented;
scenario editing and playback pending.

M4 lets a person save alternative outcomes for a Flow and replay the resulting
path on the canvas. The run simulates the functional Flow model. It does not
execute browser interactions, call HTTP services, infer outcomes from the scan
report, or claim that a path matches observed application behavior.

## Model and ownership

- A Flow can have multiple named Scenarios. Each Scenario belongs to one Flow
  through `flowId` and holds at most one override for each Service node.
- An override selects `success` or `failure` for its Service. Optional `code`
  and `httpStatus` describe the simulated outcome; neither changes routing.
- An empty or partial override list is valid. A Service without an override
  assumes `success`. The UI must identify this as a simulation default, not a
  verified result of the referenced code.
- Scenarios are saved with the Flow document, but remain separate from the
  Flow, CodeGraph, CodeReferences, and visual layout models. Playback position
  and the last run trace are transient UI state.

## Deterministic traversal

The core runner accepts a structurally valid Flow and a valid Scenario and
returns an ordered trace of visited node IDs and traversed edge IDs, plus a
terminal status and a reason when the run cannot continue. It must not depend
on React Flow, timers, canvas positions, or the scan report.

1. Start at `entryNodeId`. A Flow without an entry point cannot run.
2. At a Screen, UI, Action, or State node, consider outgoing `transition`
   edges. At a Service node, consider outgoing edges whose kind matches its
   simulated outcome.
3. With exactly one matching edge, traverse it to its target and record both
   the edge and target node. With no outgoing edges, complete at the current
   node. With outgoing edges but no matching edge, stop with a missing-branch
   reason. With multiple matching edges, stop with an ambiguous-branch reason.
   Never select an edge by array order or visual position.
4. Stop with a cycle reason on the first repeated node. Include the edge and
   repeated node in the trace so the UI can show where the cycle closed.

Structural Flow and Scenario validation failures prevent the run before
traversal. A missing branch, ambiguous branch, or cycle is a reported run
result, not a mutation of the underlying Flow. Problems in unreachable parts
of the Flow do not block a particular Scenario.

## Editing and document behavior

- Support creating, renaming, duplicating, deleting, and selecting Scenarios;
  editing a Service override; and removing an override to restore the default.
- Scenario edits take part in the editor's undo/redo and unsaved-change state.
  Deleting a Service node removes its overrides in the same undoable operation.
  Deleting the entry point leaves the Flow unable to run until another entry
  point is selected.
- Validate Scenario shape, unique IDs within the document, Flow ownership,
  and override references at the document boundary. Invalid imports do not
  replace the current work.
- Introduce a new document version for Scenarios. Existing version 1 Flow
  documents and local drafts remain readable and open with no Scenarios.
  Export and local save write the new version.
- A run uses a snapshot of the current Flow and Scenario. Editing either one,
  opening another Flow, or starting a new run clears the previous playback.

## Run experience

- Expose Run, pause, next step, and restart, with a readable ordered trace and
  a final state or actionable stop reason. The canvas highlights the current
  node and traversed edge without obscuring selection or mapping status.
- Playback motion is short and interruptible. Reduced-motion users can follow
  the same path through immediate state changes and the text trace.
- Clearly label default and overridden Service outcomes. A simulated result
  must not be presented as a scanner finding or a real HTTP response.

## Acceptance

- The Checkout example completes at Order confirmed with an empty Scenario and
  at Order error when `create-order` is overridden to `failure`.
- Replaying the same Flow and Scenario produces the same trace regardless of
  canvas layout or edge array order.
- A missing entry point, invalid override, absent matching branch, ambiguous
  branch, and cycle each have a distinguishable result and no arbitrary path.
- Scenarios survive save, reload, JSON export, and import. Existing version 1
  documents still open. Scenario edits, including Service deletion, undo and
  redo coherently.
- The Checkout Run journey works with pointer and keyboard controls, at compact
  widths and with reduced motion. Repository typecheck, tests, and build pass.

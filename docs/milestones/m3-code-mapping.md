# M3 — Code mapping and local handoff

Status: completed. Report validation, file opening, drag-and-drop
confirmation, node-level entity mapping, and the local file handoff are
implemented.

M5 replaced the report import with a Git-backed snapshot document and retains
the imported code graph across reloads. This file records the M3 handoff and
mapping contract.

M3 lets the application open a local scan report, search detected code entities,
and attach explicit CodeReferences to Flow nodes. The code graph and the
functional Flow remain separate models.

## Opening a scan report

- Accept the versioned JSON report produced by the M2 CLI through a file
  selection flow and by dragging the file into the application view.
- Provide a handoff from the CLI to the application. `scan --output <path>`
  writes the report and prints its resolved path with instructions to use
  Open JSON or drag the file onto the app. The browser-only app has no reliable
  local transfer receiver for a clickable link: a URL containing a file path
  cannot grant the browser access to that file. A direct link can be added
  when such a receiver exists.
- Validate the report and identify its type before changing application state.
  When a file arrives through drag and drop, a CLI link, or another opening path
  outside the explicit Open JSON command, show a confirmation before opening
  it or replacing the current work. Cancel leaves the current view untouched.
- Make the confirmation describe what will be opened and what current work
  would be replaced. Keep the existing Open JSON command as the explicit
  opening path.

## Mapping

- Show detected entities with their kind, name, source path, and mapping
  status. Search and select an entity before attaching a CodeReference to a
  Flow node.
- Preserve explicit references across reopens. An unresolved reference stays
  visible with a clear status; do not guess a replacement from a similar name.

The selected node's inspector provides report search, mapping status, role
selection, and unlinking. References persist in Flow saves and JSON exports;
the scan report is session data and must be reopened after a page reload.

M2 owns the local scan and stable JSON report. M3 owns opening the report in
the app, the confirmation behavior, and the file-based CLI handoff.

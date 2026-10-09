# M3 — Code mapping and local handoff

Status: in progress. Report validation, file opening, drag-and-drop
confirmation, and node-level entity mapping are implemented. CLI handoff
remains.

M3 lets the application open a local scan report, search detected code entities,
and attach explicit CodeReferences to Flow nodes. The code graph and the
functional Flow remain separate models.

## Opening a scan report

- Accept the versioned JSON report produced by the M2 CLI through a file
  selection flow and by dragging the file into the application view.
- Provide a handoff from the CLI to the application. Prefer a clickable link
  that opens the app with the generated report when a reliable local handoff is
  available; file drag and drop remains a direct path. A browser URL alone
  cannot grant access to an arbitrary local file, so the link must use a
  deliberate local transfer mechanism rather than embedding a file path.
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

M2 owns the local scan and stable JSON report. The CLI handoff can be added
once M3 has a receiver; M3 owns opening the report in the app and the
confirmation behavior.

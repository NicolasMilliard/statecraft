# Statecraft

A code-aware visual workspace for frontend user flows.

Statecraft connects functional user journeys to the frontend code that
implements them.

## Principles

- Code is the source of truth.
- Flows express human intent.
- Deterministic analysis establishes code facts.
- Changes to referenced code flag flows for review.
- The flow model remains independent from its visual renderer.

## Current milestone

M1 — Canvas: functional scope implemented.
M1.5 — Branding & UI/UX craft: completed.
M2 — Local React/TypeScript scanner and CLI: implementation complete.
M3 — Code mapping and local handoff: completed.
M4 — Scenarios and Run: completed.
M5 — Repository snapshots and local sync: completed.

The [M2 scanner contract](docs/milestones/m2-scanner-contract.md) records the
supported patterns and Checkout acceptance fixture.
The [M4 contract](docs/milestones/m4-scenarios-run.md) defines deterministic
scenario traversal and acceptance criteria. In the Scenarios panel, create a
scenario, choose simulated Service outcomes, and run or step through its path.
The [M5 contract](docs/milestones/m5-repository-snapshots.md) defines Git-backed
metadata snapshots and local comparison.

## Development

Install dependencies from the repository root:

```bash
pnpm install
```

Start the web application:

```bash
pnpm dev
```

Run the project checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

After building, scan the Checkout fixture:

```bash
node packages/cli/dist/index.js scan examples/storefront --repository-id storefront --output storefront.snapshot.json
```

The `react-ts-v1` profile detects direct TanStack file routes, named JSX
components, reachable local hooks/functions, direct TanStack Query queries and
mutations, and static global `fetch` or Axios HTTP calls. The CLI accepts
`--tsconfig` for a selected TypeScript project and `--output` to save JSON.
Unsupported dynamic paths, options, or requests produce diagnostics instead
of guessed graph links. The CLI wraps the graph in a repository snapshot with
the Git HEAD SHA, dirty state, capture time, and a stable snapshot ID. It
requires a Git repository with a commit. With `--output`, it prints the saved
file path and how to open it in the app. Open JSON accepts Statecraft flow
exports and repository snapshots; the former M2 report envelope is no longer
accepted.

You can also drop either JSON file onto the application. A dropped snapshot
requires confirmation, then stays in local browser storage across reloads.
The Sync panel compares snapshots from the same repository and analysis
profile. Select a Flow node to search the current snapshot in its inspector,
link an entity as a primary implementation or dependency, and see whether
existing references still resolve. References are saved with the Flow.

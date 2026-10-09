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
M3 — Code mapping and local handoff: in progress.

The [M2 scanner contract](docs/milestones/m2-scanner-contract.md) records the
supported patterns and Checkout acceptance fixture.

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
node packages/cli/dist/index.js scan examples/storefront --repository-id storefront
```

The `react-ts-v1` profile detects direct TanStack file routes, named JSX
components, reachable local hooks/functions, direct TanStack Query queries and
mutations, and static global `fetch` or Axios HTTP calls. The CLI accepts
`--tsconfig` for a selected TypeScript project and `--output` to save JSON.
Unsupported dynamic paths, options, or requests produce diagnostics instead
of guessed graph links. Save the report with `--output` to open it in the web
application. Open JSON accepts both Statecraft flow exports and M2 scan reports.
You can also drop either JSON file onto the application; a confirmation shows
what it will replace. The loaded scan report is currently kept until the page
is reloaded. Searching and mapping entities is the next M3 step.

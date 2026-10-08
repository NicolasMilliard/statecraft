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

Next milestone: M2 — local React/TypeScript scanner and CLI.
The [M2 scanner contract](docs/milestones/m2-scanner-contract.md) defines the first
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

After building, run the M2 scanner preview on the Checkout fixture:

```bash
node packages/cli/dist/index.js scan examples/storefront --repository-id storefront
```

The current preview emits routes and components. Its JSON diagnostics identify
the remaining M2 detectors.

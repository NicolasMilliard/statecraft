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

Next milestone: M2 — local scanner and CLI.

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

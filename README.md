# Statecraft

A visual workspace for frontend user flows: design journeys, link steps to React/TypeScript code, simulate scenarios, and review the impact of code changes. Flows and imported repository snapshots stay in local browser storage. Flows support JSON import/export; scenario playback simulates the model.

## Development

Requires Node.js 24.15+ and pnpm (version pinned in `package.json`).

```bash
pnpm install
pnpm dev
```

```bash
pnpm check      # Strict lint and formatting
pnpm fix       # Apply lint fixes and formatting
pnpm typecheck
pnpm test
pnpm build
```

Lint and formatting use Ultracite with Oxlint and Oxfmt. Run checks sequentially; shared packages are built automatically when needed.

## Scan a repository

```bash
pnpm build:packages
node packages/cli/dist/index.js scan /path/to/repo --repository-id my-app --output snapshot.json
```

The target needs a Git commit and a `tsconfig.json` selecting its source files (or `--tsconfig path/to/tsconfig.app.json`). Keep the repository ID stable. The scanner supports direct TanStack routes and queries, named components, reachable hooks/functions, and static fetch/Axios calls. Unsupported patterns produce diagnostics; automatic workflow discovery is not implemented yet.

Open the snapshot with **Open JSON** or drag it into Statecraft, then link code entities to Flow nodes in **Inspector**. [Fixtures](apps/web/test/fixtures/README.md) provide sample Flows and a snapshot.

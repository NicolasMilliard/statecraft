# Fixtures

Open Flow files with **Open JSON**. Import a snapshot separately to resolve code references. Save explicitly to retain an imported Flow in the browser workspace.

| File | Purpose |
| --- | --- |
| `checkout.statecraft.json` | Six-node Checkout Flow for editing and scenario playback. |
| `checkout-mapping-demo.statecraft.json` | Code mapping example, including an intentionally missing `LegacyError` reference. |
| `storefront.snapshot.json` | Ten code entities and nine relations from `examples/storefront`. |
| `dense-100.statecraft.json` | 100 nodes and 144 connections for canvas interaction checks. |

The Storefront source is static-analysis input, not a runnable app; its framework dependencies do not need to be installed. Expected scanner behavior is covered by `packages/scanner/test/scan-repository.test.ts`.

Regenerate its snapshot from the repository root:

```bash
pnpm build:packages
node packages/cli/dist/index.js scan examples/storefront --repository-id storefront --output apps/web/test/fixtures/storefront.snapshot.json
```

For a quick browser check: run Checkout to **Order confirmed**, override the service to failure and reach **Order error**; edit, move, undo/redo, save and reload. Check code links and missing references with the mapping example, then pan, zoom and select on the dense fixture. Repeat with the keyboard and at compact width. Automated coverage lives in the package and web test suites.

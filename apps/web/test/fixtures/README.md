# Editor fixtures

## M3 code mapping walkthrough

Open `checkout-mapping-demo.statecraft.json` with **Open JSON**, then drag
`storefront.snapshot.json` into the app and confirm. The snapshot supplies ten
code entities; the Checkout Flow remains on the canvas.

1. Select **Checkout**. Its `/checkout` route reference should resolve as
   Primary. Select **Payment form** to see its `CheckoutForm` reference.
2. Select **Order error**. Its deliberately missing `LegacyError` reference
   should say “Missing from this scan” and remain visible.
3. Select **POST /orders**, search for `POST /api/orders`, choose a role, and
   link the endpoint. The result should change from Unmapped to Linked here.
4. Change a role, unlink a reference, then use Undo and Redo. Save or export
   the Flow to check that its references persist. After reloading the page,
   select the saved snapshot to resolve them again.

The snapshot can be regenerated from the repository root after `pnpm build`:

```bash
node packages/cli/dist/index.js scan examples/storefront --repository-id storefront --output apps/web/test/fixtures/storefront.snapshot.json
```

## Dense canvas check

For the smaller product walkthrough, use
[`checkout.statecraft.json`](checkout.statecraft.json).

Open `dense-100.statecraft.json` with the editor's **Open JSON** command. It is
a normal version-1 flow document containing 100 nodes and 144 connections.
Import is undoable and does not replace the saved local draft until Save is
used.

The fixture is a 10 × 10 grid, spaced 280 × 160 flow units. Each row has nine
horizontal transitions; columns 0, 2, 4, 6, 8 and 9 connect to the next row.
Column 9 uses failure connections. Node kinds repeat Screen, UI, Action, Service
and State. Both layouts start with the same positions, so Reset layout returns
to this grid.

## Repeatable manual checks

1. Fit view, pan, and zoom in/out. Check that the graph follows the pointer.
2. Select `POST /stage/5/4`, rename it, then undo and redo.
3. Drag that node, undo once, and redo once. One drag must produce one history
   step.
4. Focus the canvas, select all with Cmd/Ctrl+A, then clear with Escape.
5. Add a Screen node. Only that node should be selected, with its Label focused.
6. Repeat the basic checks on the six-node Checkout example.

## Local profiling, 2026-10-07

Baseline: `ed33758`. Machine: Apple M5, 16 GiB RAM. Browser: Codex in-app
Chromium 154.0.0.0 on macOS, viewport 1280 × 720. React 19.2.8 / XYFlow 12.11.6.

A temporary Vite development page wrapped App in React Profiler, without
StrictMode, and collected `actualDuration` for commits between Start/Stop. The
initial mount and node selection were excluded. The page also observed Long
Tasks (>50 ms). The diagnostic page was removed after profiling.

Sequence: select the service node, start capture, apply three labels
(`POST /benchmark/a`, `/b`, `/c`), Undo three times, Redo three times, stop. The
input was filled once per label. Each run recorded 30 React commits.

| Fixture                     | Before: total / largest React commit | After: total / largest React commit |
| --------------------------- | ------------------------------------ | ----------------------------------- |
| Checkout: 6 nodes, 5 edges  | 61.7 / 3.4 ms                        | 45.8 / 3.7 ms                       |
| Dense: 100 nodes, 144 edges | 279.2 / 30.7 ms                      | 42.6 / 3.4 ms                       |

No Long Tasks were recorded in these editing runs. After the change, a separate
dense-flow check covered drag/undo/redo, select-all/clear, zoom/fit, pan and
add/focus. The moved position was restored by one Undo and reapplied by Redo;
100 nodes were selected, then zero; adding produced 101 nodes with only the new
node selected and its Label focused. No console errors were observed.

These are single-run development diagnostics, not production FPS measurements,
input-latency measurements or a performance threshold. Browser automation,
warm-up and the machine affect the timings. Repeat with a production browser
performance trace before claiming frame-rate guarantees.

The deterministic regression tests verify the optimization's mechanism: a rename
changes one node object and only adjacent edges' accessible labels; unaffected
objects, renderer measurements and selection retain their identity.

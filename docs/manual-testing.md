# Manual testing

These checks use the local CLI and browser app. The Checkout source in
`examples/storefront` is a scanner fixture, not a runnable storefront: **Run**
simulates a Statecraft Flow and does not drive a browser or send HTTP requests.

## Start the app

From the Statecraft repository root, with Node 24+ and pnpm available:

```bash
pnpm install
pnpm build
pnpm dev
```

Open the local URL printed by Vite. A saved Flow may replace the initial
Checkout example. Use **Open JSON** with
`apps/web/test/fixtures/checkout.statecraft.json` to restore a repeatable
Checkout Flow without overwriting the saved browser draft. **Save** writes the
current Flow to local browser storage; **Export JSON** downloads a portable
Flow document.

## Exercise the complete Checkout Flow

1. In **Scenarios**, create a scenario and choose **Run scenario**. The default
   outcome of `POST /orders` is success, so the trace ends at **Order confirmed**.
2. Set the simulated outcome of `POST /orders` to **Override · failure** and
   run again. The trace now ends at **Order error**. Use Pause, Next step, and
   Restart to inspect playback on the canvas and in the trace.
3. Rename a node, move it, then use Undo and Redo. Save and reload to check the
   Flow and scenario persist. Export the Flow, open that JSON, and check that
   the layout and scenario are preserved.

## Save and reopen several Flows

1. Save the Checkout Flow. Create a new Flow, give it a distinct name, add a
   node, and save it. The **Flows** panel should list both saved Flows.
2. Open Checkout from **Flows**, then reload the page. Checkout should still
   be active, and the other saved Flow should remain in the list. Switching
   Flows resets Undo/Redo history so edits cannot cross between them.
3. Edit Checkout without saving and try to open the other Flow. Cancel keeps
   the edit. **Save and continue** keeps the edited Checkout in the list;
   **Discard changes** opens the saved Flow without changing Checkout's saved
   copy. The same choice applies to **New flow**.
4. Open a different exported Flow JSON. It remains unsaved until **Save** is
   used, and existing saved Flows remain available in **Flows**.

## Exercise code mapping and snapshot comparison

Open `apps/web/test/fixtures/checkout-mapping-demo.statecraft.json` with
**Open JSON**, then import `apps/web/test/fixtures/storefront.snapshot.json`.
The Flow fixture already stores two manual links; Statecraft does not infer
links from node labels or JSX. In **Inspector**, select **Checkout**: Code
mapping should show **1 linked** and `/checkout` as Primary; its search result
should say **Linked here**. **Payment form** should likewise show `CheckoutForm`
as linked. **Order error** has a deliberately missing `LegacyError` reference.
**POST /orders** starts with **0 linked**. Search for `POST /api/orders` and link
the endpoint: that result changes from **Unmapped** to **Linked here**. Undo
removes the new link; Redo restores it.

To compare two fresh snapshots without editing the Statecraft checkout, copy
the source fixture to a temporary Git repository. Run these commands from the
Statecraft repository root:

```bash
SC_TEST_DIR="$(mktemp -d)"
SC_TEST_REPO="$SC_TEST_DIR/storefront"
cp -R examples/storefront "$SC_TEST_REPO"
git -C "$SC_TEST_REPO" init -q
git -C "$SC_TEST_REPO" add .
git -C "$SC_TEST_REPO" -c user.name='Statecraft Test' -c user.email='test@example.invalid' commit -qm baseline
node packages/cli/dist/index.js scan "$SC_TEST_REPO" --repository-id storefront --output "$SC_TEST_DIR/before.snapshot.json"
python3 - "$SC_TEST_REPO/src/components/CheckoutForm.tsx" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
path.write_text(path.read_text().replace('Place order', 'Confirm order'))
PY
node packages/cli/dist/index.js scan "$SC_TEST_REPO" --repository-id storefront --output "$SC_TEST_DIR/after.snapshot.json"
```

Open both JSON files in the app. **Sync** should report one modified entity,
`CheckoutForm`. The later snapshot is marked dirty because the source changed
without a new commit. Reload the page: both snapshots should remain available.
Switch **Current snapshot** to check the graph used by code mapping. The
comparison reports code changes and directly affected Flows. The selected
**Compare with** baseline only controls that exploratory comparison.

To check the cross-Flow preview, save the mapping demo Flow, then create
and save another Flow with a node linked to `CheckoutForm`. Import both
snapshots and open **Sync**. Both saved Flows should appear under **Flows touched
by this comparison**, with the changed entity and linked node as reasons. A
Flow with no `CheckoutForm` link should not appear. Edit the active Flow's code
link without saving: the preview should update and say **Unsaved preview**.
Changing **Compare with** only changes this exploratory preview; it does not
mark any Flow reviewed.

To check review checkpoints, select the baseline as **Current snapshot** and
save the mapped Checkout Flow. In **Sync**, choose **Mark as reviewed** for that
snapshot. Select the changed snapshot as current: Checkout should say **Needs
review** and name the changed `CheckoutForm` link. Changing **Compare with**
must not change this status. Mark the changed snapshot reviewed, then reload:
Checkout should say **Up to date**. Export and reopen the Flow JSON to check
that the checkpoint travels with it. Change the role or target of its code link
and save: its status should become **Unreviewed** until another explicit review.
An unsaved Flow cannot record a checkpoint; save it first.

To check the project review view, save two Flows linked to `CheckoutForm` and
mark each reviewed while the baseline is the **Current snapshot**. Select the
changed snapshot as current, then open **Flows**. The summary should count two
saved Flows needing review, each with its own reason. **View node** should open
the chosen Flow, center its affected node, and show it in **Inspector**. Mark
one Flow reviewed; the other must remain pending. A third Flow linked only to
an unchanged entity should say **Up to date** and not raise the count. Check
that **Unreviewed**, **Unavailable**, and **Unmapped** appear distinctly.

While one Flow has an unsaved edit, use **View node** for another saved Flow.
**Cancel** must keep the edit; **Save and continue** and **Discard changes**
must open the requested Flow and select the node. The Flows panel should show
the saved copy's status and a separate **Unsaved preview** for the active edit.
Repeat at compact width with pointer and keyboard.

## Scan a separate React/TypeScript project

The CLI can scan another local repository now. The target must have a Git HEAD
commit and a TypeScript project config inside the directory passed to `scan`.
Install that project's dependencies if its config or imports require them.
From the Statecraft repository root, after `pnpm build`:

```bash
node packages/cli/dist/index.js scan /absolute/path/to/react-project \
  --repository-id my-react-project \
  --tsconfig tsconfig.app.json \
  --output /tmp/my-react-project.snapshot.json
```

Use a stable `--repository-id` for every scan of the same project. `--tsconfig`
is relative to the scanned repository root. Omit it when the root
`tsconfig.json` includes the app's TS/TSX source files. For a Vite-style root
config that only references other projects, select the app config explicitly;
the CLI reports an error when the selected config has no scannable sources.

Open the generated snapshot JSON in Statecraft. Create a Flow manually with
**New flow**, select its nodes, and search for detected entities in **Code
mapping**. The scanner currently recognizes named JSX components, direct
TanStack file routes, reachable local hooks/functions, direct TanStack Query
calls, and static `fetch`/Axios requests. Calls inside nested callbacks are not
attributed to their enclosing component; extract a named local function when
you want that code included in the call graph. Dynamic or unsupported forms may
produce diagnostics instead of graph links. It does not derive a complete Flow
from code. Snapshot JSON contains metadata and diagnostics, not full source
files; it remains in the local browser. The CLI is currently run from this
repository, not distributed as a published package.

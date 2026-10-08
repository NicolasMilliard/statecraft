# M2 — Local scanner contract

Status: implementation complete. M2 starts with one bounded React/TypeScript
project and the Checkout fixture in examples/storefront. Changes to this
contract should be explicit because entity identities and analysis profiles
affect later code mapping and snapshot comparison.

## Outcome and boundary

The local CLI analyzes source files with an AST and emits a deterministic,
validated code graph. It reports what can be established from supported syntax;
it does not infer a user journey or claim that a detected HTTP request reaches
a particular server implementation. Source files stay local.

M2 delivers the scan and its JSON output. Attaching CodeReferences to flows is
M3. Persisting and comparing repository snapshots by commit is M5. The scanner
may use the core SyncSnapshot model later, but the first CLI output is a scan
report without timestamps or Git metadata.

M3 also owns opening a scan report in the application, including file drag and
drop and a CLI-to-app handoff. The M2 CLI should keep its output file suitable
for that handoff. The opening and confirmation behavior is specified in
[the M3 milestone](m3-code-mapping.md).

The repository currently pins TypeScript 7.0.2. Its package root exports
version information rather than the old compiler API. Use the locally
available typescript/unstable/sync project API and typescript/unstable/ast
helpers behind a scanner-owned boundary. Keep that TypeScript version pinned:
these exports are explicitly unstable, and the scanner tests cover this
integration.

## Input and output

The planned command is:

    statecraft scan <repository-path> --repository-id <id> [--tsconfig <path>] [--output <path|->]

The repository ID is supplied by the caller and must remain stable if the
checkout moves. The initial scope is one TypeScript project: use the selected
tsconfig, or the repository-root tsconfig by default. Read .ts and .tsx source
files selected by that project. Exclude declarations, dependencies, generated
files, and build output. A missing or unusable tsconfig is an error. A
monorepo-wide project search is outside this first profile.

The JSON document has this envelope:

    {
      "formatVersion": 1,
      "analysisProfileId": "react-ts-v1",
      "graph": {
        "repositoryId": "storefront",
        "entities": [],
        "relations": []
      },
      "diagnostics": []
    }

Graph conforms to CodeGraph in packages/core/src/code.ts and passes
validateCodeGraph. Diagnostics contain a stable code, a repository-relative
file path when relevant, and a human-readable message. JSON goes to the
requested output (stdout when output is omitted or "-"); human progress and
errors go to stderr. Invalid input, an unreadable project, or an invalid graph
returns a nonzero exit code and does not publish a successful report. A
supported scan with unresolved dynamic constructs returns a valid graph plus
diagnostics, without invented entities or relations.

## Identity and change rules

- Normalize file paths relative to the repository root, with forward slashes.
  Never put the absolute checkout path in an ID or the graph.
- A named entity ID consists of its kind, normalized path, and declaration
  symbol. A route uses its declaration symbol. A call-site entity (query,
  mutation, endpoint) uses the containing declaration plus its zero-based
  ordinal among calls of the same kind in that declaration. Escape delimiters
  in paths and symbols. IDs do not contain line numbers, source text, or
  structural hashes.
- A relation ID derives from its kind and the two endpoint IDs. Identical
  relations are emitted once. Sort entities and relations by ID.
- The structuralHash is a SHA-256 hex digest of a canonical AST
  representation of the entity's declaration or relevant call expression.
  Include syntax kinds, identifier and literal values, and child order;
  exclude comments and formatting trivia. Preserve meaningful string and JSX
  text. A body change changes the hash while preserving the entity ID.
- An entity's file move changes its ID in this first profile. No fuzzy
  identity matching is attempted. A change in detection or hash rules requires
  a new analysisProfileId so later snapshot diffs can reject incompatible
  scans.
- Display names do not determine identity. The route name is its static path.
  A query takes the first static string in queryKey; a mutation takes its
  referenced mutationFn symbol. When either is unavailable, use a descriptive
  owner-and-ordinal name. An endpoint name is its static method and URL.

## Supported syntax in react-ts-v1

| Fact | First supported form | Output |
| --- | --- | --- |
| Route | TanStack Router createFileRoute with a static path and a direct component reference | route entity; renders relation to component |
| React component | Named function or named arrow declaration with a PascalCase name and JSX return | component entity; renders relations for resolved local JSX components |
| Hook and local function | Named use-prefixed hook or named function reachable from a detected component, query, mutation, or route | hook/function entity; uses or calls relations for resolved references |
| TanStack Query | useQuery and useMutation imported from @tanstack/react-query, including import aliases; direct object options with queryFn or mutationFn references | query/mutation entity; owner uses it, and it calls its referenced function |
| HTTP usage | Global fetch with a static URL and static method (default GET), or direct axios method call with a static URL | endpoint entity named by method and URL; containing function calls it |

Follow local imports and aliases to resolve declarations. Package imports
identify framework APIs; a same-named local function is not a framework API.
The imports relation is reserved in this profile: imports help resolution but
are not emitted as graph edges. An endpoint means an observed frontend call
site, not a verified backend route. Dynamic routes, computed options,
unresolved references, Axios instances/interceptors, wrappers around fetch,
and arbitrary router conventions are not silently guessed. Report a
diagnostic when one of those constructs is encountered in a supported
context.

## Checkout fixture acceptance

Scan examples/storefront with repository ID storefront. The principal graph
has these ten entities:

| Kind | Name | Source |
| --- | --- | --- |
| route | /checkout | src/routes/checkout.tsx |
| component | CheckoutPage | src/pages/CheckoutPage.tsx |
| component | CheckoutForm | src/components/CheckoutForm.tsx |
| hook | useCheckout | src/hooks/useCheckout.ts |
| query | cart | src/hooks/useCheckout.ts |
| mutation | createOrder | src/hooks/useCheckout.ts |
| function | getCart | src/services/cart.ts |
| function | createOrder | src/services/orders.ts |
| endpoint | GET /api/cart | src/services/cart.ts |
| endpoint | POST /api/orders | src/services/orders.ts |

The nine required relations are:

    /checkout renders CheckoutPage
    CheckoutPage renders CheckoutForm
    CheckoutForm uses useCheckout
    useCheckout uses cart query
    useCheckout uses createOrder mutation
    cart query calls getCart
    createOrder mutation calls createOrder function
    getCart calls GET /api/cart
    createOrder function calls POST /api/orders

The fake fetch call written in a string in cart.ts creates no endpoint. The
aliases for CheckoutPage, useCheckout, and useQuery still resolve
to their original declarations. A scan repeated on the same tree produces
byte-identical JSON. Reformatting and comments leave IDs and structural hashes
unchanged. Changing the createOrder body preserves its ID and changes its
hash. Every required relation has endpoints in the validated graph.

## Completion checks

- Unit tests cover ID generation, canonical hashes, alias resolution,
  duplicate removal, path normalization, and diagnostics.
- Fixture tests compare the ten expected entities and nine relations and
  exercise formatting-only and body changes.
- CLI integration verifies stdout/stderr separation, exit codes, and repeat
  output. The repository typecheck, tests, and build pass.
- A scan of one real React/TypeScript project records observed coverage and
  performance. The README documents the command and its supported syntax.

## Validation record

On 2026-10-08, the `react-ts-v1` scanner produced the ten Checkout entities
and nine relations above with no diagnostics. Repeated CLI scans produced
byte-identical JSON. The repository typecheck, tests, and build passed.

As a second project, the scanner analyzed Statecraft's own React/TypeScript
web app with `--tsconfig apps/web/tsconfig.app.json`: 50 entities (23
components, 24 functions, three hooks), 72 relations (35 renders, 34 calls,
three uses), and no diagnostics. One local CLI run took 0.11 seconds of wall
time. This app does not use TanStack Router, TanStack Query, or HTTP calls, so
the Checkout fixture remains the acceptance case for those detectors.

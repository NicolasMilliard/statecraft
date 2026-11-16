# Working on Statecraft

- Use pnpm from the repository root and Node.js 24.15+. Run `pnpm fix`, then `pnpm check`. Application changes also require `pnpm typecheck`, `pnpm test`, and `pnpm build`, sequentially: tests consume built workspace files.
- Use the root Ultracite configurations. Keep named function declarations and hoisting, PascalCase component files, and kebab-case modules. Suppressions must name a specific rule and explain the API constraint; unused suppressions fail.
- Keep Flow, CodeGraph, scenarios, review checkpoints, and canvas layout separate. Preserve keyboard access, reduced-motion support, and the neutral/iris visual identity defined in the existing components and CSS.
- Scanner facts must come from supported syntax; report unresolved constructs instead of guessing. Keep zero-based call ordinals and nested-function execution boundaries. IDs use relative paths and symbols; hashes ignore formatting and comments. Changing detection or identity rules requires a new analysis profile.
- Snapshot identity excludes capture time; comparisons require matching repository IDs and analysis profiles. Source files stay local; snapshots contain metadata.
- Impacts cover explicit code references and their incident relations. Review is explicit per Flow/repository and compares with its last reviewed snapshot, not the exploratory baseline. Missing history or changed mappings cannot appear reviewed; importing a snapshot does not acknowledge changes.
- Scenario playback is deterministic simulation. Unspecified services assume success; missing or ambiguous branches and cycles stop with a reason. Do not present simulation or code changes as verified runtime behavior.
- Fixtures exercise specific syntax. Preserve their behavioral assertions when formatting changes source strings used by the tests.
- Keep documentation minimal. Do not create Markdown files, milestone plans, implementation reports, or extra READMEs unless explicitly requested. Update existing documentation only when durable usage or constraints change.
- Leave changes uncommitted for review unless the user asks for a commit.

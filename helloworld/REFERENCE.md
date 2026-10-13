# HelloWorld FSS Stack audit reference

This is a generated, buildable reference project for audits. It starts from
[`fssstack-cli/examples/hello-world.json`](../fssstack-cli/examples/hello-world.json)
and retains the selected Vite, Next.js, Fumadocs, backend, library, Clerk, and
MongoDB surfaces. It contains no credentials or private source data.

Use `provenance/reference.json`, `provenance/stackforge-inputs.json`,
`provenance/output-integrity.json`, and `provenance/validation.json` before
comparing a target. The verifier compares current Stackforge source content, not
`HEAD`, so a reference-only commit does not make its own reference stale.

Run this from `authoring-tools` to verify a checkout:

```bash
node ../helloworld/scripts/verify-provenance.mjs \
  --stackforge-root "$(dirname "$PWD")"
```

The captured Forum source in `provenance/forum-content/` was reviewed when this
reference was made. It is a read-only snapshot; live credentials and hosted
services were not checked.

The generated project is intentionally a shared baseline. Refresh it in a new
directory first, validate it, review the diff, and then replace this directory in
a focused commit. Do not modify it during a target audit. Start a safe candidate
outside the repository with:

```bash
node scripts/refresh-reference.mjs --stackforge-root /absolute/path/to/stackforge
```

The candidate command intentionally does not replace this directory. In the
candidate, copy `fssstack/shell`, run the pinned Vite/Next/Fumadocs scaffolders
recorded in `provenance/reference.json`, apply the reviewed Clerk and MongoDB
overlays, materialize the four Forum paths, regenerate both manifests, and run
`pnpm install && pnpm test && pnpm typecheck && pnpm build`. Review that second
run against this baseline in a separate worktree before replacing it.

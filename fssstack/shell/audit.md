# Audit this FSS Stack project

Use this process when asked to audit how this repository aligns with the
maintained FSS Stack reference project. Compare it with the committed,
verified HelloWorld reference, then write
`docs/audits/YYYY-MM-DD-fssstack.md` in **this project's root**. Explain which differences serve
the project and which are accidental drift. This is an assessment, not a request
to replace working product code or apply fixes.

## 1. Record the project and its intended shape

Read the project's agent instructions, README, `fssstack.yaml`, workspace
configuration, root files, architecture decisions, and directory tree. Record
the absolute project path, Git commit, branch, and working-tree status. Include
existing uncommitted changes in the assessment and identify them as such; do not
reset, stash, or overwrite them.

Inventory the current apps, framework types, standard packages, custom packages,
docs sites, executable libraries, and selected extensions. Use `fssstack.yaml`
as a starting point, then reconcile it with the actual structure: the original
setup inputs may be stale. Record the evidence and any assumptions. Preserve
the project's names, package scope, and relevant scaffold choices in the reference
inputs, but do not copy existing tooling configuration or dependency versions
just to make the comparison match.

The reference needs equivalent **scaffold structure**, not product functionality.
Generate empty app/library scaffolds for supported project types and retain the
standard packages that today's setup calls for. Do not recreate domain code,
custom package internals, real datasets, or every historical package. Map custom
packages in the inventory and assess their placement and workspace integration;
their absence from the reference is not itself drift. If a project type has no
current scaffold, explicitly mark that comparison as unavailable.

## 2. Resolve and verify the maintained reference

Do not assume Stackforge lives in a particular home-directory path. Resolve its
absolute path from an explicit `FSSSTACK_ROOT` value, a documented project
metadata field, or an already-known verified checkout. Confirm that it is a
Stackforge Git checkout and record its revision. If its location is absent or
ambiguous, ask the user where Stackforge is or whether it should be cloned.

The default baseline is:

```text
<verified-stackforge>/helloworld/
```

Read `provenance/reference.json`, `fssstack.json`, and the materialized Forum
source under `provenance/forum-content/`. Verify the reference's input hash,
generator provenance, selected options, Stackforge revision, and every recorded
source-content hash before comparing it. A reference does **not** become stale
only because it was committed on an earlier date. It is stale only when its
recorded inputs, generator provenance, or verified source content no longer
match, or when its own validation record is missing or failed.

If verification succeeds, audit against the committed reference read-only. Do
not run current external scaffolders merely to obtain a moving baseline.

If the reference is missing, stale, or unverifiable, stop the comparison and
ask the user to choose one of these paths:

1. **Temporary audit:** generate a one-off reference outside both repositories,
   report its limitation, and do not treat it as the shared baseline.
2. **Shared refresh:** delegate a separate worker a complete request containing
   the verified Stackforge path, target branch, exact HelloWorld input, required
   Forum-source materialization and review, generator/tool versions, validation
   commands, commit instructions, and the requirement to preserve unrelated
   changes. The worker must generate outside the existing reference first,
   validate it, review the resulting diff, then replace the shared reference in
   one focused commit.

Before proposing a pull request, detect available Git hosting tooling instead
of assuming `gh` exists. If PR submission is unavailable or not approved, push
only when authorized and ask the user how they want the refresh submitted.

## Historical temporary-generation procedure

Use this only when the user selects the temporary-audit path. Create a unique
temporary directory outside this repository. For example, from
the real project root:

```bash
audit_project_root="$PWD"
audit_workspace="$(mktemp -d "${TMPDIR:-/tmp}/fssstack-audit.XXXXXX")"
mkdir -p "$audit_workspace/reference" "$audit_workspace/evidence"
```

Verify the resolved temporary path is outside the real project before proceeding.
Record both paths in the report. Keep setup inputs in `reference/` and source
snapshots and command logs in the sibling `evidence/` directory so setup starts
with only the expected input files.

Fetch and read the current setup instructions and input configuration template:

```bash
npx -y @mp-lb/forum-cli read --store mp-lb/fssstack SETUP_PROCESS.md > "$audit_workspace/evidence/SETUP_PROCESS.md"
npx -y @mp-lb/forum-cli read --store mp-lb/fssstack forum.example.yaml > "$audit_workspace/reference/forum.yaml"
```

Check that each fetch succeeded before using its output. Write the reconciled
`fssstack.yaml` into `reference/`. Read the current standards, agent guidance,
and applicable extension docs from `mp-lb/fssstack`, including documents linked
by setup. Use explicit store reads or pull them into the temporary workspace;
do not refresh or sync over the real project's documentation. Keep a list of
docs reviewed, their retrieval time, and available versions or content hashes.
Local docs may be older: compare them too, rather than treating them as the
current authority.

From `reference/`, follow the retrieved setup process to assemble a brand-new
project: fetch the published shell, scaffold the relevant apps/libraries, wire
the shared config, and apply the applicable extensions. Do not clone this real
project as the reference, and do not use the bare shell as a substitute for
assembling the selected project types. Record tool/scaffolder versions, resolved
dependency versions, exact commands, and any deviations from the setup process.
Keep the reference's lockfile as evidence.

For this audit, setup runs locally in the temporary workspace only. Do not push,
publish, deploy, provision cloud resources, copy real secrets, or run a recursive
audit from the reference's own `audit.md`. Use placeholders or isolated local
services where needed. Record extension steps requiring external credentials
or resources as unverified. Run the applicable automated checks in the reference
(lint, typecheck, tests, build), recording passes, failures, and skipped checks.
Only perform manual/browser testing when explicitly requested. Do not start
services using the real project's ports or data.

If setup fails, preserve the logs and report a partial audit. A broken or
unavailable baseline is a baseline limitation, not evidence that the real
project is wrong. Never silently repair the reference and present the result
as the unmodified current scaffold.

## 3. Compare in priority order

Compare meaning and behavior, not just lines. Review the folder tree before
file contents, then work through the following order:

| Priority | Surface | What to inspect |
| --- | --- | --- |
| High | All root files, including dotfiles | Workspace/package config, package-manager versions, lockfile, TypeScript/lint/test config, Zapper, environment-file conventions, Forum mappings, setup inputs, context files, README, and this audit guide. Record every root file as compared, project-specific, excluded with a reason, or unverified. |
| High | Folder structure | Placement and responsibilities of `apps/`, `packages/`, `docs/`, `etc/`, scripts, and tooling directories such as `.github/`; workspace globs; missing, misplaced, or redundant scaffold directories. Compare the layout to current documentation, allowing documented project-specific additions. |
| Medium | Shared configuration and workflows | `etc/`, CI/release wiring, shared standards and context sources, app scaffold configuration, extension wiring, and cross-workspace dependencies. |
| Low | Package internals | Compare applicable standard scaffold packages such as `core`, `server`, and `trpc`, plus generated library scaffolding where there is a meaningful counterpart. Custom packages are isolated sandboxes; check their workspace/public boundaries, not conformity of their domain implementation to starter code. |

Priority describes review order and attention, not severity. A package issue
that breaks workspace builds or shared contracts can still have high impact.
Do not require standard packages that current setup intentionally removes for
this project type (for example, server/trpc in a project without a backend).

Use directory inventories and focused diffs, then inspect relevant docs and
project evidence for each meaningful difference. Include added, removed, and
changed files. Exclude `.git/`, dependencies, caches, build output, and audit
scratch files from content diffs. Inspect root lockfiles for dependency/tooling
differences, not thousands of mechanically changed lines. For secret-bearing
root files, compare existence and documented configuration requirements without
copying or exposing values; record the content exclusion in coverage.

Do not flag business logic, custom tests, assets, or a replaced starter page
simply because a fresh project lacks them. Group expected product additions,
but investigate deviations in shared conventions and boundaries. A newer
scaffolder/dependency version alone is not proof of a defect: distinguish
available baseline updates from compatibility problems or unsupported divergence.
Do not mutate the real project to test a fix. Run its checks only when appropriate
under its instructions, without autofix, installs, or lockfile rewrites; report
checks not run and why.

## 4. Classify differences using evidence

| Category | Meaning | Expected action |
| --- | --- | --- |
| Justified divergence | A project requirement, architecture decision, compatibility constraint, or demonstrated behavior explains why this differs. Cite the evidence; age or “it was customized” is not enough. | Keep; document the rationale if needed. |
| Needs rationale | The difference could be reasonable, but the evidence is insufficient or conflicting. State the plausible reason as a hypothesis, not a fact. | Identify the question or check that would establish whether to keep or align it. |
| Unintentional drift | Evidence shows an accidental omission, obsolete configuration, or inconsistency with the applicable standard, with no supporting project requirement found. Explain the concrete mismatch and its impact. | Recommend a focused alignment change. |

Track **Unverified** separately for incomplete comparisons, inaccessible docs,
unsupported scaffolds, or blocked validation. Do not force these into a verdict.
Keep impact/severity separate from the category and review priority. Current
Doctrine is the comparison baseline, not a reason to discard a justified design.

## 5. Write `docs/audits/YYYY-MM-DD-fssstack.md` in the real project

Work in an isolated project worktree and create `docs/audits/` if needed.
Use the audit date in the report filename; preserve earlier reports and choose
a distinct suffix for another audit on the same day. Commit the report and
explicitly authorized audit-process updates for normal project-owner integration.
Keep generated comparisons and logs outside the repository or in ignored scratch
paths. Do not commit scratch artifacts or apply remediation unless asked.

Use this report structure:

```markdown
# FSS Stack audit report

## Scope and provenance
- Audit date, real repository path, branch/commit, working-tree state
- Reference and evidence paths, source store, docs versions/hashes and retrieval time
- Reconciled setup inputs, app/package mapping, assumptions, tool versions
- Baseline assembly status: complete or partial; setup deviations

## Summary
- Counts by category and unverified comparisons
- Most important root/configuration and folder-structure findings

## Coverage
| Surface/path | Priority | Baseline counterpart or applicable doc | Compared / project-specific / excluded / unverified | Notes |
| --- | --- | --- | --- | --- |

## Findings
### A001 — Descriptive finding title
- Category: Justified divergence / Needs rationale / Unintentional drift
- Review priority: High / Medium / Low
- Impact: High / Medium / Low, with a concrete explanation
- Real project: path and relevant lines/behavior
- Fresh reference: counterpart path and relevant lines/behavior
- Doctrine: source document and section
- Difference and evidence:
- Project-specific rationale (or missing evidence):
- Recommendation: keep / document / investigate / align
- Validation needed:

## Validation and limitations
| Project/reference | Command or comparison | Passed / failed / skipped / unverified | Evidence or reason |
| --- | --- | --- | --- |

## Recommended next steps
Ordered actions, starting with root files and folder structure; no fixes applied.
```

Include coverage even when there are no findings. Link to supporting project
files and reference evidence, and avoid dumping raw diffs or secrets into the
report. State what remains uncertain and how it could be resolved. Leave the
temporary reference available for review and give its path in the handoff; do
not delete it before the report can be checked.

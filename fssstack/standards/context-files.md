# Context files

Fssstack projects keep agent context easy to inspect, easy to regenerate, and
safe for each developer to customize locally.

The committed source of truth is split in two:

- `agents-md/` contains the project-level source blocks.
- `AGENTS.base.md`, `AGENTS.md`, and `CLAUDE.md` are generated from those blocks
  and committed to git. Root `AGENTS.md` and `CLAUDE.md` must not be gitignored.

Optional local instruction files are not committed:

- `AGENTS.local.md`
- `AGENTS_WORKTREE.md`

Keep private or machine-specific content in local files. The committed root
agent files contain the shared project instructions that every clone should
have immediately.

## Tasks

Each project should expose two Zap tasks:

- `zap task context-build [extra-context ...]` builds the project source blocks
  into `AGENTS.base.md`, then copies that result to `AGENTS.md` and `CLAUDE.md`.
- `zap task context-copy` copies the committed `AGENTS.base.md` to `AGENTS.md`
  and `CLAUDE.md` without rebuilding.

Both tasks may accept output flags for agent-specific files:

- `--agents` writes only `AGENTS.md`.
- `--claude` writes only `CLAUDE.md`.

When neither flag is present, both root files are written.

`context-build` may also accept one or more extra context paths. These are
appended after the project-level blocks before writing the local agent files.
This is for private instruction files a developer explicitly chooses for their
own working copy; no shared external checkout is required. It changes the
tracked root agent files locally, so review the diff and do not commit private
context. Run `zap task context-copy` to restore the shared version.

## Workflow

The root agent files are available immediately after cloning. After changing
project source blocks, run `zap task context-build` and commit all three
generated files. To restore the committed base context, run:

```bash
zap task context-copy
```

That copies `AGENTS.base.md` to the root agent files.

Developers who want personal or global context can instead run:

```bash
zap task context-build ~/some/global.md
```

The important invariant is that reviewers see the same project context in
`AGENTS.base.md`, `AGENTS.md`, and `CLAUDE.md`, with the source blocks in
`agents-md/`. Private additions are never committed.

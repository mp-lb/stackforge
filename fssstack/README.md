# fssstack

**Start a new project at [fssstack.mp-lb.dev](https://fssstack.mp-lb.dev/).**

fssstack is an opinionated setup system for full-stack TypeScript projects. It
is not a CLI you install or a template you fork — it is a payload of setup
instructions, standards, and a working shell monorepo that an agent reads and
follows to assemble a real target repo for you.

You don't read these docs directly. You go to the home page, answer a few
questions about what you're building, and it hands your coding agent a prompt.
The agent pulls the shell, layers in the projects you asked for, and wires
everything to the shared packages below.

## What it ships

- **A working shell monorepo** — root workspace config, shared `etc/` presets,
  internal `core` / `server` / `trpc` packages, an example backend, and a
  publishable example library + CLI. It installs, typechecks, tests, and builds
  on day one.
- **Standards docs** — the conventions the agent (and you) follow: tRPC, errors,
  logging, the event schema, CRUD, env vars, formatting, release process, and
  more.
- **Extensions** — opt-in setup for MongoDB, Redis, Bull, Clerk + RBAC, S3,
  Playwright, and custom domains, layered in only when a project needs them.
- **React Native setup** — a separate path for mobile.
- **Project audits** — every shell-based project gets root `audit.md` to guide
  comparison against a fresh project assembled from current Doctrine. Root
  configuration and folder structure come first; findings distinguish justified
  divergence, missing rationale, and drift in `tmp/audit-report.md`.

Existing projects can adopt the audit process by fetching
`shell/audit.md` from the `mp-lb/fssstack` store into root `audit.md` (review any
existing file before replacing it), linking it from their README and agent
context sources, and adding `/tmp/` to their root `.gitignore`.

## What it configures

The shell depends on a set of published `@mp-lb/*` packages, so config and
runtime building blocks aren't copy-pasted into every repo — they're versioned
and shared:

- **[`@mp-lb/fssstack-config`](https://www.npmjs.com/package/@mp-lb/fssstack-config)**
  — shared dev-tooling presets: the TypeScript (`tsconfig`) taxonomy and ESLint
  config. Dev-time only.
- **[`@mp-lb/fssstack-testing`](https://www.npmjs.com/package/@mp-lb/fssstack-testing)**
  — testing presets and utilities: Vitest configs, a tRPC caller harness,
  in-memory MongoDB, jest-dom setup, and Playwright config.
- **[`@mp-lb/fssstack-platform`](https://www.npmjs.com/package/@mp-lb/fssstack-platform)**
  — stable runtime building blocks: structured logger, the canonical event
  schema, base errors, and tRPC setup.
- **[`@mp-lb/fssstack-observability`](https://www.npmjs.com/package/@mp-lb/fssstack-observability)**
  — OpenTelemetry bootstrap exporting traces and metrics to any OTLP backend,
  with first-class Sentry coexistence.

The shell already wires all of these up — there's nothing to install or
configure at the foundation level.

## The stack

TypeScript end to end, with: Zod, tRPC (TanStack-style hooks),
react-hook-form + zod resolver, shadcn/ui + Tailwind CSS, and Vitest. Vite for
frontends, Next.js where it fits, a tRPC backend, and pnpm workspaces.

## What it doesn't include

- It is **not the application** — there's no product code here, just the means
  to scaffold one.
- It is **not a fork-me template**. You don't clone this repo; the agent
  assembles a fresh target repo from the shell plus external scaffolders
  (shadcn CLI for Vite, etc.).
- It does **not** carry deployment config — deploying the target repo is out
  of scope for these docs.
- It assumes **no** authoring tooling is present in your target repo. These docs
  describe how to build the repo, not how this repo is maintained.

---

To get started, head to **[fssstack.mp-lb.dev](https://fssstack.mp-lb.dev/)**.

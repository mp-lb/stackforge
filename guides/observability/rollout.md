# Observability rollout — status

Per-project status of the OTel → Axiom rollout. Recipe: [recipe.md](./recipe.md).

Scope the fleet from data, not memory: `factory project list`
(FSS Stack apps that Terraform-deploy — the ones this applies to).

## Shared boundary — DONE

The reusable pieces are all shipped on npm (from the `tools` repo):

- **`@mp-lb/fssstack-observability`** — OTel-primary bootstrap (traces/metrics/logs
  → OTLP), Sentry as errors-only side-car, and `createTrpcSpanMiddleware`.
- **`@mp-lb/fssstack-platform`** — the shared logger (single root pino, real
  `child`, `LOG_PRETTY`) and the open `source.env` event schema.

Per-project work is now just *consuming* these — see [recipe.md](./recipe.md).
Track per-project rollout work in Factory.

## Status

Scope the fleet from data: `factory project list`.

| Project   | Status | Notes |
|-----------|--------|-------|
| doctrine  | 🟡 partial | Backend on the package + shared logger; OTLP path proven end-to-end (against Grafana initially). **Not yet on Axiom / the flipped 0.3.0+ build / tRPC middleware / worker** — folded into the fleet RFW. |
| (all others) | ⚪ not started | Covered by the RFW. |

Legend: ⚪ not started · 🟡 in progress · 🟢 shipped & verified

## Per-project checklist (copy per project — see recipe for detail)

- [ ] Adopt shared logger (re-export) if still on a local copy (§1)
- [ ] Add `@mp-lb/fssstack-observability`; bootstrap in `instrument.ts` (§2)
- [ ] Wire `createTrpcSpanMiddleware` into the base procedure (§3)
- [ ] `config.ts` validation (§4)
- [ ] env wiring — `LOG_PRETTY` local, prod endpoint + secret header + whitelist + runbook (§5)
- [ ] `cpu_idle = false` on each instrumented Cloud Run service (§6)
- [ ] verified in a deployed env: traces+metrics+logs in Axiom, Sentry still gets errors (§7)
- [ ] worker, if any — see [worker.md](./worker.md)

## Open threads

- **Memory / instrumentation footprint (unconfirmed, low priority).** doctrine
  OOM'd at 512Mi once, but it coincided with heavy local load (self-DDoS via a
  sync process), so the cause isn't confirmed — back on 512Mi to test under normal
  traffic. *If* the OTel footprint turns out to be the real issue, the fix is a
  curated instrumentation set (http, fastify, mongodb, ioredis, pino, runtime) in
  the package instead of the full `getNodeAutoInstrumentations` bundle. Not a
  priority unless OOM kills recur under normal load.
- **Worker** instrumentation is a separate, smaller task — [worker.md](./worker.md).
- **Template it?** Once a few projects are done, have **fssstack** scaffold new
  projects with the deps + instrument-file pattern + `cpu_idle = false`.
- **Resource attributes convention.** Standardise `service.namespace` /
  `deployment.environment` across the fleet so views are uniform across backends.

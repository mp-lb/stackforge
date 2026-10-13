# Canonical recipe — add observability (OTel → Axiom) to an fssstack project

> The instrumentation logic lives in shared packages; a project just adds the
> deps, wires a few lines, and sets prod env. Assumes an fssstack project like
> doctrine: Node services, tRPC-under-Fastify, deployed to Cloud Run via
> Terraform, secrets in `docs/secrets.json.enc`.
>
> The backend is **Axiom** (see [decisions.md](./decisions.md)) — but it's just
> an OTLP endpoint. Everything below is backend-agnostic; only §0's endpoint +
> header values change if you ever swap backends (e.g. to Grafana).

## The model (so you don't re-derive it)

- **OpenTelemetry is the engine.** [`@mp-lb/fssstack-observability`](https://www.npmjs.com/package/@mp-lb/fssstack-observability)
  stands up the OTel NodeSDK, which owns the tracer/meter/logger providers and
  exports **traces + metrics + logs** via OTLP to the backend (Axiom) — the
  single, complete superset.
- **Sentry is secondary** — a standalone error tracker only (`skipOpenTelemetrySetup`),
  never in the trace pipeline. Errors → Sentry; everything → Grafana.
- **Logs** are pino records shipped via OTLP and **trace-correlated** (auto, by
  `instrumentation-pino` hooking pino at the module level — works with any
  pino-based logger).
- **tRPC**: `createTrpcSpanMiddleware` gives a span per procedure (HTTP-level
  spans can't, because tRPC batches).
- **Opt-in by endpoint:** no `OTEL_EXPORTER_OTLP_ENDPOINT` → no OTLP export. This
  is what keeps **local dev off Grafana Cloud by default**.

The worker (and any non-tRPC service) is a separate, smaller concern — see
[worker.md](./worker.md).

## 0. Axiom — one-time, per project (or shared dataset)

In Axiom, create a **dataset** and an **API token** with ingest rights. Then:

- `OTEL_EXPORTER_OTLP_ENDPOINT` = `https://api.axiom.co` (or `https://api.eu.axiom.co`
  for the EU region) — the exporter appends `/v1/traces`, `/v1/logs`, `/v1/metrics`.
  **Not secret.**
- `OTEL_EXPORTER_OTLP_HEADERS` = `Authorization=Bearer <token>,X-Axiom-Dataset=<dataset>`
  — comma-separated; the token is **secret**, the dataset name isn't. (All three
  signals land in the one dataset; Axiom's UI separates traces/logs/metrics. Use
  per-signal `OTEL_EXPORTER_OTLP_*_ENDPOINT`/headers only if you want separate
  datasets.)

> **Swapping backends later (e.g. Grafana):** change only these two values.
> Grafana Cloud's are an OTLP-gateway URL (`https://otlp-gateway-<region>.grafana.net/otlp`)
> + a Basic-auth header (`Authorization=Basic <base64 instanceID:token>`, which
> Grafana hands you percent-encoded as `Basic%20…` — leave the `%20`, the SDK
> decodes it). No code changes either way.

## 1. Adopt the shared logger (if not already)

If the project still has its own logger, replace its body with a re-export so it
gets the fixed singleton/`child` behaviour + pretty printing:

```ts
// packages/server/src/logger.ts
export { createLogger, logger, type Logger, type LogMeta }
  from "@mp-lb/fssstack-platform/logger/server";
```

Add `@mp-lb/fssstack-platform` to that package. All existing import sites are
unchanged.

## 2. Add the package + bootstrap (backend)

```sh
pnpm --filter <backend> add @mp-lb/fssstack-observability
```

`src/instrument.ts`, imported as **line 1** of `index.ts` (before anything
instrumented loads):

```ts
import { startObservability } from "@mp-lb/fssstack-observability";
import { env } from "./config";

await startObservability({
  serviceName: "<project>-backend",
  environment: env.APP_ENV,
  sentryDsn: env.SENTRY_DSN,        // omit on services without Sentry
  sentry: { sendDefaultPii: true }, // error capture only
});
```

App-level Sentry wiring (`Sentry.setupFastifyErrorHandler(app)`,
`captureException`) stays in the app. Top-level await is fine (ESM).

## 3. Wire the tRPC span middleware

Where the base procedure is defined (e.g. `packages/server/src/trpc.ts`):

```ts
import { createTrpcSpanMiddleware } from "@mp-lb/fssstack-observability";

const spanMiddleware = createTrpcSpanMiddleware(t);
export const publicProcedure = t.procedure.use(spanMiddleware);
```

## 3a. Add request correlation

Follow [request-correlation.md](./request-correlation.md): clients send
`X-Request-ID`, the backend returns the effective ID, request/procedure/error logs
include `requestId`, and failed client calls print or log the ID. Return/print a
trace ID too when the active span makes that cheap.

## 4. Config validation (`src/config.ts`)

```ts
OTEL_EXPORTER_OTLP_ENDPOINT: z.string().trim().url().optional(),
OTEL_EXPORTER_OTLP_HEADERS: z.string().trim().min(1).optional(),
```

## 5. Env-var wiring (follow the project's `env-vars` standard)

- [ ] **Local**: `LOG_PRETTY=true` in `.env.local` (readable pino-pretty logs).
      Leave `OTEL_EXPORTER_OTLP_ENDPOINT` **unset/commented** — local stays off
      the backend (it bills ingestion + pollutes prod data).
- [ ] `.env.production` → `OTEL_EXPORTER_OTLP_ENDPOINT` (non-secret)
- [ ] prod secret `OTEL_EXPORTER_OTLP_HEADERS` → `docs/secrets.json.enc`
- [ ] prod whitelist (`env-map.yaml`) → **both** OTEL vars under the service
- [ ] runbook secrets table → `OTEL_EXPORTER_OTLP_HEADERS`

> If the project builds runtime env from `env-map.yaml` + decrypted secrets
> (doctrine's `build-runtime-env-vars.mjs`), adding to `env-map.yaml` is enough —
> and a missing secret fails the deploy loudly, which is what you want.

## 6. Cloud Run — CPU always-on + memory headroom (Terraform)

```hcl
resources {
  limits   = { cpu = "1", memory = "1Gi" }  # NOT 512Mi — see below
  cpu_idle = false   # CPU always allocated so background OTLP flushes aren't throttled
}
```

- **`cpu_idle = false`** — without it, batch exports are throttled between
  requests and drop on scale-down.
- **Watch memory.** The in-process OTel SDK + `getNodeAutoInstrumentations`
  (~40 instrumentation modules) + the pipelines add some baseline (rough order
  ~40–80 MiB), eating into headroom. doctrine saw OOM kills at 512Mi once — but
  that **coincided with heavy local load** (a sync process hammering it), so the
  cause is unconfirmed; testing whether 512Mi holds under normal traffic. **Keep
  an eye on memory after instrumenting; bump (e.g. 1Gi) if OOM kills appear.**
  *(Possible optimization if footprint does prove to be the issue: have the
  package expose a curated instrumentation set instead of the full auto bundle.)*

## 7. Verify

Local export is off, so verify in a **deployed** env: deploy, then in Axiom look
for `service.name=<project>-backend` — traces (incl. per-procedure tRPC spans +
nested Mongo/redis), metrics (Node runtime), and logs (with a `trace_id`).
Confirm Sentry still gets errors. (To prove the path before deploying, you can
`curl` a test span to `<endpoint>/v1/traces` with the headers.)

## Versions / publishing

Shared packages are on npm (`@mp-lb/fssstack-observability`,
`@mp-lb/fssstack-platform`). Changes go through changesets + CI; a brand-new
package's first publish is manual and follows the package’s release instructions.

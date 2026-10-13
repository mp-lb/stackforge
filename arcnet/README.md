# ArcNet

ArcNet adds cloud deployment to a project: **push to GitHub → build → deploy** after initial setup. It does not require FSS Stack; the current installer expects Zap, pnpm and GitHub. [Setup guide](SETUP.md) · [FSS Stack extension](../fssstack/extensions/arcnet.md)

## What gets added?

For two Vercel sites, a Cloud Run backend and a MongoDB binding, the current installer produces this layout:

```text
your existing repo/
├── .github/workflows/
│   └── deploy-arc.yaml              NEW — one deployment workflow for all services
├── .arcnet/
│   ├── services.json                YOU ADD — selection of the four services
│   ├── Dockerfile                   YOU SUPPLY — builds/runs the backend container
│   ├── run.mjs                      NEW — runs checks, plans and deployment
│   ├── project.json                 NEW — repo identity, service list, approval and CI auth
│   ├── network.yaml                 NEW — regions, state storage, providers and shared resources
│   ├── env.production.json          NEW — public app environment values
│   ├── operator.json                NEW — project-local credentials-file pointer
│   ├── package.json                 NEW — deployment tool dependencies
│   ├── pnpm-lock.yaml               NEW — exact deployment dependency versions
│   ├── .npmrc                       NEW — isolates these dependencies from your app workspace
│   ├── .gitignore                   NEW — excludes credentials, state and installed tools
│   └── modules/vercel-static/
│       ├── main.tf                  NEW — Vercel project/domain/environment resources
│       └── module.yaml              NEW — Vercel build/upload instructions
├── zap.yaml                        MODIFIED — setup adds the deploy: declaration
├── package.json                    EXISTING — must already pin the pnpm version
└── pnpm-lock.yaml                   EXISTING — your application's dependency lockfile
```

One workflow deploys the whole project. Most files live in `.arcnet/`; `zap.yaml` holds the deployment declaration. [Templates and file sources](SETUP.md#the-pieces-files-you-add-to-a-project) explain where each file comes from. Static Vercel-only projects currently use a smaller file set, documented in the setup guide.

## What does ArcNet support?

| Capability | Current implementation | Shared or per project? |
| --- | --- | --- |
| **Vercel** — landing pages and frontends | Static uploads; framework builds through the Terraform module | Separate site projects/deployments |
| **HTTP backend** — APIs | Cloud Run containers (`cloud-run-web`) | Separate service per project |
| **MongoDB** | Database binding on an existing Atlas cluster (`shared-mongo-atlas`) | **Shared cluster**, with a database namespace and scoped user per project |
| **Redis** — cache and queues | Creates an Upstash database (`upstash-redis`) | **Per project today; shared instance planned** |
| **Bull** — background jobs | Generic container hosting (`gce-worker`), not a Bull-specific pool | **Separate worker VM today; shared Bull worker pool planned** |
| **S3** — object storage | Bucket and scoped credentials (`aws-s3`) | Separate bucket per project |

## Shared services and project isolation

The intended model is **one shared MongoDB cluster, one shared Redis instance, and one shared Bull worker host/pool** to reduce cost. Projects use their own database, key and queue namespaces. Each project's Bull workers run its own code and consume its own queues on the shared hosting.

A shared-service binding supplies **a connection string + a project namespace + project-scoped credentials**. Namespaces prevent collisions; access controls must enforce isolation. Shared infrastructure is provisioned once outside project deployments; project Terraform only manages bindings/access where needed, not another copy of the shared instance.

**Only MongoDB sharing is implemented today.** Shared Redis, the Bull pool and their namespace/access enforcement are planned. [Shared-service design](SETUP.md#shared-services-intended-model)

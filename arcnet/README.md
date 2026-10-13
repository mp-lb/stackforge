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

| Service | Shared or per project? |
| --- | --- |
| Vercel websites | Per project |
| Cloud Run backends | Per project |
| MongoDB | Shared |
| Redis | Per project |
| Bull workers | Per project |
| S3 storage | Per project |

Shared services use the project slug as the isolation boundary, with project-scoped namespaces and credentials.

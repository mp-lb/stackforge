# ArcNet

ArcNet adds cloud deployment to a project: **push to GitHub → build → deploy** after initial setup. It does not require FSS Stack; the current installer expects Zap, pnpm and GitHub. [CLI package and templates](https://github.com/mp-lb/tools/tree/main/packages/arcnet) · [Setup guide](SETUP.md) · [FSS Stack extension](../fssstack/extensions/arcnet.md)

## Overview

Set up an ArcNet environment once, connect each project to it, then push to GitHub to build and deploy.

### Environment Setup

Create the provider accounts, choose the environment slug and base domain, collect credentials in a secrets JSON file, and configure GCP and shared-service access. Full environment automation and the secrets-file handoff are still to be implemented. [Full environment setup details](environment/setup.md).

### Project Setup

Select the services to deploy, add the ArcNet files, and configure the project's environment and deployment credentials in GitHub Actions. After onboarding, pushes to main build and deploy the project. [Full project setup details](SETUP.md).

## What gets added?

For two Vercel sites, a Cloud Run backend and a MongoDB binding, the current installer produces this layout:

```text
your existing repo/
├── .github/workflows/
│   └── deploy-arc.yaml              GENERATED — GitHub deployment workflow
├── .arcnet/
│   ├── services.json                YOU ADD — services and deployment settings
│   ├── Dockerfile                   YOU ADD — backend image, built from repo root
│   ├── project.json                 GENERATED — project identity, approval and CI auth
│   ├── network.yaml                 GENERATED — environment/network settings to review
│   ├── .gitignore                   GENERATED — excludes local secrets and Terraform files
│   └── env.production.json          OPTIONAL — public application environment values
├── zap.yaml                        UPDATED — deployment declaration
├── package.json                    UPDATED — pins @mp-lb/tools-arcnet
└── pnpm-lock.yaml                   UPDATED — run pnpm install after setup
```

The package owns the shared TypeScript CLI, runners and Terraform modules. Its first npm release is awaiting a publishing-credential fix. Projects do not copy those files or maintain a second package manifest/lockfile. The workflow calls `pnpm exec arcnet`. [File details](SETUP.md#the-pieces-files-you-add-to-a-project).

Static Vercel references use `.arcnet/vercel.json` as input and only generate `project.json`, `.gitignore` and the workflow; no network file or Dockerfile is needed. Both profiles install the same CLI package.

## What does ArcNet support?

| Service            | Shared or per project? |
| ------------------ | ---------------------- |
| Vercel websites    | Per project            |
| Cloud Run backends | Per project            |
| MongoDB            | Shared                 |
| Redis              | Per project            |
| Bull workers       | Per project            |
| S3 storage         | Per project            |

Shared services use the project slug as the isolation boundary, with project-scoped namespaces and credentials.

## Third-party services

These are the provider accounts ArcNet uses, depending on what you deploy.

| Provider | Used for | Needed when |
| --- | --- | --- |
| GitHub | Source and deployment workflows | All projects |
| Google Cloud (GCP) | Compute, container registry, Terraform state and deployment identities | Terraform deployments |
| Cloudflare | DNS records for custom domains | ArcNet manages service domains |
| Vercel | Website hosting | Deploying Vercel sites |
| MongoDB Atlas | Shared MongoDB cluster | Using MongoDB |
| Upstash | Redis hosting | Using the Redis module |
| AWS | S3 object storage | Using the S3 module |

## Layers

1. **Accounts** — company accounts, billing, domain ownership and initial credentials.
2. **ArcNet environment** — shared infrastructure, Terraform state, DNS and secret distribution.
3. **Project** — deployment files, service domains and isolated service bindings.
4. **Delivery** — GitHub Actions builds and deploys on pushes to main.

[Create a new ArcNet environment](environment/setup.md) · [Add a project](SETUP.md) · [Audit an existing project](AUDIT.md)

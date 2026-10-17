# ArcNet

ArcNet adds publishing credentials and selected deployments to an existing project. It does not require FSS Stack; the current installer expects Zap, pnpm, and GitHub. [Project setup](SETUP.md) · [Environment setup](environment/setup.md) · [FSS Stack extension](../fssstack/extensions/arcnet.md)

## Files in a project

A new installation has one project-owned configuration file. Add only the other files that the selected capabilities need:

```text
project/
├── .arcnet/
│   ├── arcnet.yaml                 project-specific services, public variables, identities, and secret-source map
│   ├── <service>.Dockerfile        only for a container service
│   └── secrets/*.json.enc          only when using encrypted Forum sources
├── .github/workflows/
│   ├── deploy-arc.yaml             generated only when there is a deployable service
│   └── validate-arcnet-secrets.yaml  generated only when encrypted sources are configured
├── zap.yaml                        existing local-development configuration; no duplicate deploy block
├── package.json                    pins @mp-lb/arcnet
└── pnpm-lock.yaml                  updated after installation
```

The [ArcNet package](https://github.com/mp-lb/tools/tree/main/packages/arcnet) supplies the standard `mp-lb` environment, provider and Terraform defaults, deployment runners, and workflow templates. ArcNet renders Zap Arc's deployment input temporarily; a project does not commit a network snapshot or a second service list. Existing installations using `project.json`, `services.json`, `network.yaml`, or `secrets.json` remain supported until explicitly migrated.

A package-only project selects no services: it needs no domain, Dockerfile, cloud project, or deploy workflow. It can use the `publish` secret consumer to supply npm credentials to its existing release workflow. [Publishing setup](SETUP.md#package-only-projects).

## What ArcNet currently supports

| Capability                 | Current behavior                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Vercel sites               | Creates missing approved projects on first deploy; static or Next.js builds and optional domains |
| Cloud Run APIs             | Per-project GCP service and container registry                                                  |
| MongoDB Atlas              | Project-scoped database user on a shared cluster                                                |
| Redis                      | Shared URL can be supplied through secrets; ArcNet does not provision project-scoped access yet |
| S3                         | Per-project bucket                                                                              |
| Bull workers               | Deferred; no qualified shared worker deployment                                                 |
| npm publishing credentials | `publish` consumer supplies selected secrets to an existing release workflow                    |

Shared services use the project slug as the naming boundary; credentials must also enforce access isolation. [Domain lifecycle design](DOMAINS.md) · [Audit](AUDIT.md).

# ArcNet

ArcNet adds secrets, package and desktop releases, and selected deployments to an existing project. The full installer uses pnpm and GitHub. [ArcNative](https://github.com/mp-lb/stackforge/tree/main/arcnative) uses ArcNet's encrypted secrets snapshots for standalone npm-based Expo apps. [Project setup](SETUP.md) · [Initial environment setup](initial-setup.md) · [FSS Stack extension](../fssstack/extensions/arcnet/README.md)

The examples below use the current `mp-lb` environment preset. ArcNet still needs a configurable environment preset before another organization can install it without MapLab-specific defaults.

## Files in a project

A new installation has one project-owned configuration file. Add only the other files that the selected capabilities need:

```text
project/
├── .arcnet/
│   ├── arcnet.yaml                 project-specific services, Forum variable paths, identities, and secret-source map
│   ├── <service>.Dockerfile        only for a container service
│   ├── variables/*.json            synced non-secret Forum values, when configured
│   └── secrets/*.json.enc          only when using encrypted Forum sources
├── .github/workflows/
│   ├── deploy-arc.yaml             generated only when there is a deployable service
│   └── validate-arcnet-secrets.yaml  generated only when encrypted sources are configured
├── package.json                    pins @mp-lb/arcnet
└── pnpm-lock.yaml                  updated after installation
```

The [ArcNet package](https://github.com/mp-lb/tools/tree/main/packages/arcnet) supplies the standard `mp-lb` environment, provider and Terraform defaults, deployment runners, and workflow templates. ArcNet calls Terraform directly using its own application modules. Production settings come entirely from `.arcnet/arcnet.yaml`; the runner never reads a local stack or invokes Zapper. Removed multi-file deployment formats are not supported. Terraform projects use the `foundation` and `identity` outputs from [mp-lb/arcnet-base](https://github.com/mp-lb/arcnet-base). That repository owns projects, registries, IAM, budgets and state storage and is applied locally by an administrator. Application CI uses its own isolated state bucket.

A package-only project needs no domain, Dockerfile, cloud project, or deploy
workflow. Opt into `arcnet packages setup --repository owner/repo` to install
package release CI independently of application deployments. ArcNet owns the
publisher and verifier; target projects do not copy their implementations.
[Package releases](package-releases.md).

[Desktop releases](desktop-releases.md) are another independent layer. The tooling is available in every ArcNet installation; no Electron dependency, desktop workflow or signing consumers are installed until an app needs them. Adding Electron activates setup through its extension guide, without requiring hosted applications.

## What ArcNet currently supports

| Capability                 | Current behavior                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Vercel sites               | Creates missing named projects on first deploy; static or Next.js builds and optional domains |
| Cloud Run APIs             | Per-project GCP service and container registry                                                  |
| MongoDB Atlas              | Project-scoped database user on a shared cluster                                                |
| Redis                      | Shared URL can be supplied through secrets; ArcNet does not provision project-scoped access yet |
| S3                         | Private `arcnet.<project>.backend` bucket by default; browser CORS follows app domains          |
| Bull workers               | Deferred; no qualified shared worker deployment                                                 |
| Desktop releases | Built-in tooling and workflow template, activated when an Electron app is added; signing, installers and update feeds |
| Public package publishing | [npm releases](package-releases.md): packed-content comparison, patch publishing, verification and optional CI |
| Private package publishing | [GitHub Packages](private-package-publishing.md): release orchestration, registry credentials, authenticated checks and local/CI consumer access; access grants and private workflow setup are guided steps |

Shared services use the project slug as the naming boundary; credentials must also enforce access isolation. [Domain lifecycle design](domains.md) · [Audit](audit.md).

## Code ownership

- **Zapper:** local process, container and task execution. No production deployment engine or Terraform modules.
- **Tools:** reusable ArcNet runners, application modules, config validation, workflow templates, secrets and variables.
- **ArcNet Base:** concrete administrator-managed infrastructure and foundation modules, applied locally with an authorized Google CLI account.
- **Stackforge:** setup guidance and conventions; no executable deployment engine.

The application module library stays in Tools because it is shared code. Base
owns the definitions that establish cloud projects, registry, identities,
permissions, budgets and state storage. App deployments consume exported base
configuration and cannot change those foundation resources.

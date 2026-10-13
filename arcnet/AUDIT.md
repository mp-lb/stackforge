# Audit an ArcNet project

Check whether an existing installation matches what [project setup](SETUP.md) would produce today. ArcNet should be self-contained, with a small, explicit set of files outside `.arcnet/`. Audit first; report proposed fixes before changing the project or its infrastructure.

## Establish the baseline

1. Record the target repository commit and any uncommitted changes. Record the Stackforge guide commit and both the installed and current supported `@mp-lb/tools-arcnet` versions; use the current supported package’s installer and templates as the baseline.
2. Identify the actual deployable services from the app packages, build scripts, Dockerfiles, Zap configuration and workflows. Confirm intended destinations and existing provider identities. Local services and package publishing do not automatically need ArcNet.
3. Follow the current setup guide as a comparison checklist. Compare the installed files with the installer and templates for the same selected services. If generating reference output helps, use a disposable copy with placeholder credentials; never rerun setup over the real installation just to inspect differences.
4. Check every setup requirement: service selection, build commands and outputs, container context and entry points, ports and health endpoints, domain mappings, environment bindings, dependency versions, CI authentication, approval state and workflow triggers.
5. Check project and environment identities consistently across configuration. Shared services use the project slug as the isolation boundary, with project-scoped namespaces and credentials. Confirm bindings agree with those identities; do not infer credential permissions from a namespace alone.

Use the current supported deployment profile as the baseline. Planned shared Redis/Bull infrastructure and environment automation are not requirements until implemented. A repo with no deployment installation should be reported as **not installed**, not treated as a broken installation.

## Allowed locations

| Location | Allowed contents |
| --- | --- |
| `.arcnet/` | Deployment configuration, Dockerfiles, project-specific deployment notes and audit reports. |
| `.github/workflows/deploy-arc.yaml` | The project's ArcNet workflow. |
| `zap.yaml` | The deployment declaration alongside existing local configuration. |
| Existing root manifests and lockfiles | Application dependencies and package-manager settings required by setup. |
| Existing README or agent instructions | A short pointer to ArcNet's central guides or project-specific notes under `.arcnet/`. |

The current Vercel adapter prefers `.arcnet/vercel.json`; report root `arcnet.vercel.json` as a compatibility input to migrate. Root `arcnet.services.json`, `arcnet.network.yaml` and Dockerfiles are supported compatibility inputs, but report migration to the documented `.arcnet/` layout where applicable. Provider-required application files and tooling also used for local development or releases need individual review; they are not automatically ArcNet clutter.

New installations use the root `@mp-lb/tools-arcnet` dependency and lockfile. Copied runners, separate deployment manifests/lockfiles, `.npmrc`, `operator.json` and bundled module copies are legacy files. For an older installation, compare modifications and migrate every consumer before removing them; follow [the migration steps](SETUP.md#upgrade-an-existing-copied-installation).

## Things that should not be there

Grow this list from concrete findings. For each item, record **pass**, **fail**, **not applicable**, or **unverified**, with file/line evidence and a proposed replacement. An exception needs an explicit reason; it is not a silent pass.

| Check | Expected replacement or action |
| --- | --- |
| ArcNet-only scripts, runbooks or network files scattered through root, `scripts/`, `docs/` or `.github/` | Keep project-specific material under `.arcnet/`; link to central setup instructions instead of copying them. Keep the workflow in GitHub's required location. |
| Duplicate or abandoned deployment workflows and provider auto-deploy triggers | One intentional delivery process, with each active trigger accounted for. Confirm provider settings before claiming duplication. |
| Unpinned deployment tools, cloning the engine's default branch in CI, or editing downloaded provider modules during deployment | Use the current pinned tooling and supported configuration. Fix reusable behavior in its owning source. |
| Obsolete migration overrides, expired workaround comments, or unused credentials and service bindings | Verify whether each still has a consumer; remove only confirmed obsolete items during a separately authorized fix. |
| Environment bootstrap or shared-infrastructure administration copied into an application repo | Follow the central [environment setup](environment/setup.md); keep application deployment scoped to the project. |
| Hard-coded operator home directories or implicit machine-global configuration | Explicit project/environment configuration using the current setup contract. |
| Tracked credentials, plaintext secret dumps without cleanup, or provider credentials exported more broadly than needed | Ignored or temporary secret files with cleanup and appropriately scoped CI credentials. Never include values in the report. |
| Documentation that disagrees with the installed services, current file layout or supported capabilities | Concise project-specific notes and links to the current guides. |

Do not delete generic secret-loading or release tooling simply because it mentions a deployment provider. Check its actual consumers first.

## Report

Keep the report in the audit response, or under `.arcnet/audits/` if a saved report is requested. Summarize missing files, configuration drift, forbidden leftovers, justified exceptions and unverified checks. Give each finding its evidence, expected state and smallest proposed fix.

Distinguish repository evidence from live infrastructure verification. Do not claim that DNS, cloud permissions or deployed services are healthy without checking them. Do not deploy, apply Terraform, rotate credentials, delete resources or run manual browser tests as part of this document review. Record any required operational checks separately.

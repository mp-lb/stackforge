# Private package publishing

**Owner: ArcNet.** This topic includes registry routing, publishing credentials,
release CI, authenticated verification, and read access for local and CI consumers.
FSS Stack owns build/test commands, exports, declarations and package contents.
Private package delivery does not require application hosting or Electron.

The supported registry path today is **GitHub Packages**. Restricted npm packages
and other private registries are not implemented by ArcNet's current publisher.

## Package eligibility and visibility

A package intended for GitHub Packages must be publishable (`private` absent or
`false`) and select the registry explicitly:

```json
{
  "name": "@example/shared-api",
  "private": false,
  "publishConfig": { "registry": "https://npm.pkg.github.com" },
  "repository": {
    "type": "git",
    "url": "https://github.com/example/backend.git"
  }
}
```

`private: true` means **never publish this workspace package**; ArcNet excludes it
from both registries. Registry visibility and access are separate settings. Check
that the package is private and associated with the intended repository; do not
change visibility as a side effect of setup. GitHub initially creates npm packages
as private. See [GitHub's npm registry guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

ArcNet discovers packages under `packages/*` and `apps/*`, orders dependencies,
compares archives and publishes changed patch versions. GitHub-selected packages
are excluded from its public npm path. Preserve existing package names, registry
choices, release holds and custom workflows.

## Producer setup

Adapt the project's GitHub Packages workflow to call:

```sh
pnpm exec arcnet packages publish --registry github --dry-run
pnpm exec arcnet packages publish --registry github
```

The dry run still needs registry read access and may build/pack; it does not upload
or retain version edits. Publishing restores source manifests after the operation.
Keep the project's validation gates, repository/branch guards and concurrency policy.

Use `GITHUB_TOKEN` with `packages: write` for the producer's associated repository.
Configure the registry token through the package manager, for example a checked-in
`.npmrc` containing a variable reference, never a literal credential:

```ini
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Supply `NODE_AUTH_TOKEN` from the workflow token only to the steps that need it.
If a separate long-lived credential is required, manage its source and delivery
through ArcNet secrets, with a narrow `publish` consumer. An ArcNet consumer maps
a source value into a process; it does not grant GitHub permissions.

`arcnet packages setup` currently generates **public npm** CI. It does not generate
a GitHub Packages workflow or grant registry access. Adapt an existing private
workflow deliberately; do not install a second public publisher over it.

### Keep install routing separate from publishing

The producer can depend on public packages even when it publishes a private one.
`publishConfig.registry` selects the publication destination; it is not a reason
to redirect all dependency installation to GitHub Packages.

A scope-wide setting such as `@mp-lb:registry=https://npm.pkg.github.com` also routes
public `@mp-lb/*` dependencies there. Inspect the dependency graph and lockfile
before adding it. Forum already installs its public build dependencies with a
separate npmjs user config, then publishes with its GitHub registry configuration.
Retain this separation. If consumers need both registries under one scope, establish
and test their actual routing/lockfile strategy; do not assume a scope mapping has
a per-package fallback. Bootstrap public ArcNet tooling before entering the private
consumer configuration when needed.

## Consumer access

Record the producer package, consumer repositories/build environments, registry and
the credential variable they use. Grant read access to intended consumers separately
from producer write access.

For GitHub Actions, grant the consumer repository **Read** under the package's
**Manage Actions access**, then use its workflow `GITHUB_TOKEN` with `packages: read`.
Access to a source repository alone is not proof that another repository's workflow
can download the package. Verify the effective package permissions and inheritance.
See [GitHub package access controls](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

For local installs or non-GitHub build runners, use a supported credential with
package-read access (GitHub currently supports a classic PAT with `read:packages`).
Store it outside Git; use ArcNet's encrypted sources and an explicit consumer
mapping where configured. Preserve existing variable names such as `GITHUB_PAT`.
A CI job token is not a persistent credential for a later external build.

When the intended scope routes entirely to GitHub Packages, a consumer can use:

```ini
@example:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Supply the referenced variable at install time. Do not place credentials in
frontend/mobile public variables or application bundles. For Expo consumers,
ArcNet owns the package access requirement and credential source; ArcNative/shared
Expo tooling owns delivering that credential to its install/build environment.
Preserve the project's package manager and its existing integration.

## Verification and completion

Verify from the **consumer's** credential context, using the exact released version:

```sh
npm view '@example/shared-api@1.2.3' version --registry=https://npm.pkg.github.com
npm pack '@example/shared-api@1.2.3' --registry=https://npm.pkg.github.com --ignore-scripts --pack-destination <scratch-directory>
```

Create the scratch directory first. Confirm the reported version and inspect the
downloaded archive. These commands prove metadata and archive read access; they do
not execute downloaded lifecycle scripts. Then run the real consumer's frozen
install (`npm ci` or `pnpm install --frozen-lockfile`) and relevant checks in its
intended local/CI environment. The producer's token passing a check does not prove
consumer access.

`arcnet packages verify` currently checks **public npm only**. Do not use it as
private-publication evidence. Authenticated verification is part of this ArcNet
setup guide until the CLI supports it directly.

Completion requires the intended private visibility/access settings, successful
publication, exact-version download and a successful consumer install. Record what
was actually checked and anything still blocked. Authentication/access failures,
registry routing errors and billing/quota limits need different fixes; preserve
the provider's specific error. Do not make packages public or change billing to
work around a failed verification.

## Existing projects and context

Forum publishes `@mp-lb/forum-trpc` through `arcnet packages publish --registry github`;
Forum Mobile is an existing consumer. Use those configurations as evidence of the
current integration, not as permission to grant other repositories access. Verify current delivery separately before claiming that package’s release is healthy.

Record package/registry names, consumers and verification commands in project
context, without tokens. Keep the shared package-publishing context import.
Existing compiled context can remain unchanged until the project chooses to refresh.

[Shared package release mechanics](package-releases.md) · [ArcNet setup](SETUP.md)

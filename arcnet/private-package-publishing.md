# Private package publishing

ArcNet is the setup guide. The implementation is the `@mp-lb/arcnet` package in
[Tools](https://github.com/mp-lb/tools/tree/main/packages/arcnet). It owns the package
list, npmrc routing, Zap tasks, private release workflow and authenticated verification.

## Set up a publisher

Install the published tooling in the workspace, then declare the packages:

```sh
pnpm add -Dw --save-exact @mp-lb/arcnet@0.7.29
pnpm exec arcnet packages private setup --repository mp-lb/forum --publish @mp-lb/forum-trpc
```

This writes `.arcnet/packages.json`, configures the selected manifests and `.npmrc`,
adds `packages-install` / `packages-publish` Zap tasks when `zap.yaml` exists, and
installs private release CI. Existing custom workflows are preserved: migrate their
calls explicitly and use `--no-workflow` during setup. `private: true` still prevents
publication; make a package publishable explicitly before selecting it.

## Set up a consumer

For a project such as Forum Mobile, run the same setup command once with its private
dependency and existing token variable. Bootstrap the public tooling outside private
scope routing:

```sh
npm exec --yes --registry=https://registry.npmjs.org --@mp-lb:registry=https://registry.npmjs.org --package=@mp-lb/arcnet@0.7.29 -- arcnet packages private setup --consume @mp-lb/forum-trpc --token-env GITHUB_PAT
```

The generated `.npmrc` contains only a variable reference. Supply that variable
through Zapper's configured local environment and the existing CI/build secret
injection. `zap task packages-install` passes Zapper's resolved environment to the
normal package-manager install. GitHub CI uses a package-readable job token; external
build runners use their configured read credential. No token goes in Git or a client bundle.

Scope routing must be unambiguous. Setup refuses to redirect undeclared public
dependencies from the same scope to GitHub. Keep public bootstrap tooling separate
(as Forum Mobile already does), or use distinct namespaces.

## Use and verify

Publish with `zap task packages-publish` locally or the generated CI workflow. The
workflow publishes only the declared list and verifies the exact resulting versions.
A consumer can verify an exact version with `arcnet packages private verify
@mp-lb/forum-trpc@<version>`, then run its normal frozen install and checks.

Keep the GitHub package private and grant intended consumers read access. The tool
configures clients and workflows; it does not change GitHub visibility, access grants
or billing. See the [tool documentation](https://github.com/mp-lb/tools/tree/main/packages/arcnet/docs/private-packages.md)
for the configuration contract, migration details and command reference.

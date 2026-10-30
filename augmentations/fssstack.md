# Fssstack augmentation


## When to use

Apply this after creating a new fssstack project.

## Instructions

- Docs folder

### Environment sources and CI access

For every new MAP Lab FSS Stack project, including projects without deployment, read `projectSlug` and `githubRepository` from `fssstack.yaml`. Use those values for `<project-slug>` and `<owner/repo>` below. The GitHub repository must exist, and `fm` and `gh` must be authenticated with access to the Forum store and repository. Use the project's normal pnpm dependency workflow to install `@mp-lb/arcnet` in the workspace root; it provides the secrets tooling even when deployment is not configured.

Ensure `/projects/<project-slug>/variables.json` exists in the `mp-lb/mp-lb` Forum store. If absent, create it as `{}` with `fm write` without `--force`; preserve any existing values. The shared standard secrets source is `/admin/standard-secrets.json.enc` in the same store. It must already exist; do not replace it.

Create `.arcnet/arcnet.yaml` if absent, substituting the values from `fssstack.yaml`:

```yaml
version: 1
project: <project-slug>
repository: <owner/repo>
environment: mp-lb
variables:
  store: mp-lb/mp-lb
  paths:
    - /admin/standard-variables.json
    - /projects/<project-slug>/variables.json
```

If the file already exists, preserve its services, configuration, sources and consumers, and ensure the variables paths above are present in that order. Project variables override standard variables. Do not overwrite an existing configuration. The ArcNet project must also match `zap.yaml`; resolve a mismatch before proceeding.

Provision the shared source with `secrets add`. For the project source, use `secrets init` if the Forum file does not exist, or `secrets add` if it already exists:

```sh
pnpm exec arcnet secrets add --key ARCNET_STANDARD_SECRETS_KEY --store mp-lb/mp-lb --path /admin/standard-secrets.json.enc --repository <owner/repo>
pnpm exec arcnet secrets init --key ARCNET_PROJECT_SECRETS_KEY --store mp-lb/mp-lb --path /projects/<project-slug>/secrets.json.enc --repository <owner/repo>
pnpm exec arcnet variables sync
pnpm exec arcnet env check --password
```

For an existing project secrets file, replace `init` with `add`. These commands prompt for the Forum encryption password, add per-file recipients, provision GitHub repository secrets, record sources, and generate encrypted snapshots and validation CI. If a GitHub key already exists, use `--existing-key` with `secrets add` only after verifying it decrypts the corresponding source; do not overwrite it. On reruns, retain the existing source keys and consumer mappings. If the standard source or required access is missing, ask the operator to restore access rather than replacing the source. Never commit plaintext secrets.

Review and commit the configuration, encrypted snapshots, variable snapshots, generated workflow, dependency and lockfile. Configure consumer mappings for actual uses as they arise; the validation checks decryption and configured mappings. ArcNet deployment onboarding can extend this configuration later without recreating these sources.

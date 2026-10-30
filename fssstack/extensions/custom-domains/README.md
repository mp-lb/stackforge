# Custom domains

Apply this after configuring the application's hosting provider. Domain setup depends on the actual deployment and DNS owner; FSS Stack has no default company domain or cloud account.

For ArcNet projects, read `fm read SETUP.md --store mp-lb/arcnet` and `fm read domains.md --store mp-lb/arcnet`. Current project service domains are declared in `.arcnet/arcnet.yaml`. Domain lifecycle commands described as proposed in the design are not available commands. Legacy projects may use other configuration: establish the active source before changing it.

## Configure and verify

1. Record the desired canonical frontend/API hostnames, hosting services and authoritative DNS owner in the project runbook. Preserve stable internal resource identifiers during a public rebrand unless resource replacement is intentional.
2. Configure hostnames through the selected provider and update the actual deployment source. Do not create an obsolete `infra/terraform.tfvars` merely to follow an older recipe.
3. Complete domain ownership verification and configure DNS using the exact records returned by the provider. Keep account-specific defaults and shared identities in the organization's augmentation/environment configuration.
4. Update application URLs, CORS, authentication redirects, webhook/callback URLs and public links together. Configure canonical redirects when multiple frontend hostnames are supported.
5. Verify DNS, TLS, frontend behavior and backend health. Retain the old working hostname until the replacement works, then retire only the mappings/records owned by this project.

Record external DNS dependencies in the runbook rather than assuming access to a client's registrar. Read current provider documentation before executing provider-specific changes.

## Install agent context

After applying and validating this capability, install its context payloads. For existing files, compare and merge instead of overwriting project-specific instructions. These commands are for a first install from the target repository root:

```sh
mkdir -p context
fm pull --direct --store mp-lb/fssstack --path extensions/custom-domains/context/domains.md --target context/domains.md
grep -qxF '@domains.md' context/index.md || printf '\n@domains.md\n' >> context/index.md
```

Adapt the blocks to the installed package paths, services, tasks and configuration. Remove assumptions that do not apply. Then run `zap task context-build` and commit the source blocks and all three generated agent files.

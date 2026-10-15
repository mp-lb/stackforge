# Audit an ArcNet project

Compare the project to the current [setup guide](SETUP.md) without changing infrastructure. Record the repository commit, installed ArcNet package version, selected capabilities, actual CI triggers, and live verification separately from repository checks.

## New installation baseline

- `.arcnet/arcnet.yaml` is the single project-owned ArcNet declaration. It contains only selected services, optional non-secret variables, CI identity, and encrypted-source/consumer references. The standard environment is supplied by the pinned package.
- Container services have `.arcnet/<service>.Dockerfile`. Package-only projects have no Dockerfile or deploy workflow. Terraform and static Vercel projects have one `.github/workflows/deploy-arc.yaml` generated from the selected mode.
- Encrypted Forum sources, if used, have reviewed ciphertext files under `.arcnet/secrets/` and one generated `.github/workflows/validate-arcnet-secrets.yaml`. Check source order, GitHub key names and consumer mappings. Application keys are whitelisted in the selected service's `env` list.
- `zap.yaml` remains the local-development declaration and has no duplicate `deploy:` block. The root package manifest pins `@mp-lb/arcnet` and its lockfile agrees.
- Check service build/output paths, image entrypoints, health ports, public domains, provider identities, workflow permissions, approval state, and actual deployment results. A passing offline `arcnet check` does not prove cloud health.

## Negative checks

Report each as pass, fail, not applicable or unverified, with file evidence:

- Copied network/provider templates, duplicate service lists, old `project.json`, `services.json`, `network.yaml`, `env.production.json`, `secrets.json`, or deployment blocks alongside `arcnet.yaml`.
- ArcNet-only scripts or runbooks scattered outside `.arcnet/`, and copied runners or Terraform modules that should come from the pinned package.
- Duplicate deployment workflows or provider Git integrations that cause unintended second deployments.
- Tracked plaintext secrets, unscoped secret consumers, stale encrypted snapshots or obsolete credentials.
- Worker deployments through the deprecated GCE container startup mechanism, or claims that shared Redis/Bull access controls are implemented when they are not.
- Domains, DNS records, callbacks or redirects that no longer match the selected services.

Older multi-file projects are **legacy installations**, not automatically broken. Compare them against [the legacy guide](LEGACY_SETUP.md), then plan a reviewed migration before deleting files or changing Terraform state. Do not run new setup over them. Report the smallest fix for each finding and distinguish code/config evidence from live provider verification.

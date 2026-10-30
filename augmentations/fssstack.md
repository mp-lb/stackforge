# Fssstack augmentation


## When to use

Apply this after creating a new fssstack project.

## Instructions

- Docs folder

### Environment sources

For every new MAP Lab FSS Stack project, ensure these three Forum files exist in `mp-lb/mp-lb`, using the project slug from `zap.yaml`:

- `/admin/standard-secrets.json.enc`: the shared encrypted standard secrets. Reuse the existing file; never replace or reset it.
- `/projects/<project-slug>/secrets.json.enc`: encrypted project-specific secrets.
- `/projects/<project-slug>/variables.json`: non-secret project-specific variables.

Check for each file before creating anything. Create only missing project files: initialize the variables file with an empty JSON object (`{}`), and encrypt an empty JSON object with `fm encrypt` using the normal Forum encryption password before writing the encrypted output to the secrets path. Use `fm write` without `--force` so an existing file is not overwritten. Do not commit plaintext secrets or write them to the non-secret variables file. If the shared standard secrets file is missing or the encryption credentials are unavailable, ask the operator to restore or provide access rather than creating a replacement. Preserve all existing values and encryption recipients when files already exist.

These Forum sources are created even when the project does not use ArcNet. ArcNet onboarding may later attach the sources and configure only the consumers the project needs.

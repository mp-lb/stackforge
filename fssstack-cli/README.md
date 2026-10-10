# @mp-lb/fssstack

Command-line equivalent of the FSS Stack web configurator. Generates a setup prompt for your coding agent, a `fssstack.yaml` manifest, or the web configurator's raw JSON values. It does not create repositories, install the generated stack, or deploy anything.

Requires Node.js 20.19 or newer. Once published:

```sh
npx @mp-lb/fssstack --name "Atlas" --description "Team workspace" \
  --clerk --mongodb \
  --backend api --backend worker \
  --frontend web:react-vite --frontend admin:react-nextjs \
  --frontend docs:react-fumadocs --lib sdk
```

Arrays use repeated flags, one entry per flag, with no JSON escaping or comma parsing. Frontends use `NAME:TYPE`; supported types are `react-vite`, `react-nextjs`, and `react-fumadocs`. Explicit backend/frontend entries replace their defaults. Order is preserved. Duplicate extensions are removed; duplicate app/library slugs are errors, including collisions after normalization.

```sh
# Write a manifest to a new file; existing files are never overwritten.
fssstack --name "Atlas" --description "Team workspace" \
  --clerk --mongodb --format yaml --output fssstack.yaml

# A frontend-only configuration, with the prompt's prerequisite text omitted.
fssstack --name "Docs" --description "Product documentation" \
  --no-backends --frontend docs:react-fumadocs --no-prerequisites

# Raw values, matching the web configurator's JSON view.
fssstack --description "Team workspace" --format json
fssstack --help
```

Defaults match a fresh web form: name `My App`, derived slug, emoji 🚀, package prefix `@fssstack`, the shared shadcn preset, backend `backend`, frontend `frontend:react-vite`, and no libraries or extensions. Description is required (1–200 characters). Names normalize using the web UI's slug rules; package prefixes normalize to lowercase. Use `--slug`, `--emoji`, `--package-prefix`, and `--shadcn-preset` to override project settings. `--no-backends` and `--no-frontends` explicitly select empty lists and cannot be mixed with entries for the same list.

Use `--extension clerk|mongodb|s3|bull|playwright|redis` once per extension; `--clerk` and `--mongodb` are convenient aliases. The pipe notation lists alternatives, not literal argument syntax.

Output defaults to the setup prompt with prerequisites enabled. `--format yaml` emits only the manifest; `--format json` emits normalized web config values. Stdout contains only the requested text, with one trailing newline. File confirmations and errors go to stderr. Invalid input exits with status 1 without generating output. No arguments shows help.

## Development

From the Stackforge checkout:

```sh
pnpm -C fssstack-cli install --frozen-lockfile
pnpm -C fssstack-cli typecheck
pnpm -C fssstack-cli test
pnpm -C fssstack-cli pack --pack-destination /tmp
node fssstack-cli/dist/cli.js --help
```

The build bundles the web configurator's schema, normalization, YAML renderer, and shared prompt renderer directly from `fssstack-start/app/`. There are no copied templates to drift. The published package includes `dist/cli.js` and installs only `yaml` and `zod`; it does not require the authoring checkout or Next.js. CLI dependency resolution for typechecking and parity tests is local to this package, so installing the web app is not required to build the CLI.

Tests execute the built command and compare exact prompt/YAML/JSON output against the web functions, covering every frontend and extension, defaults, empty arrays, quoting, errors, and safe file output. To validate changes to shared sources, also run the web app's tests and lint.

## Delivery

Version `0.1.0` is prepared for an initial public scoped npm release. Before release, review the CLI interface, merge the validated change, and use an authorized npm publishing account to publish from this directory. Do not publish from the repository root. `prepack` rebuilds the executable. No publishing or authentication is performed by the CLI or its build.

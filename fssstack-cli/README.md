# @mp-lb/fssstack

Two commands: get a JSON Schema, or validate configuration JSON and get a setup prompt. The JSON is exactly what the FSS Stack website's **JSON → Copy JSON** action copies.

Requires Node.js 20.19 or newer. Version 0.2.0 replaces the 0.1.x field-by-field flags.

```sh
fssstack schema > schema.json
fssstack prompt < project.json > prompt.md
```

You can also pass the JSON as one argument:

```sh
fssstack prompt '{"description":"My app"}'
```

Both the web app and CLI import the same Zod schema, defaults, normalization, and prompt renderer from `fssstack-start/app/`. The schema command generates draft 2020-12 JSON Schema directly from Zod. No CLI-specific field definitions, defaults, or prompt templates are maintained. Rebuilding the CLI picks up changes to those shared sources; installed npm versions receive them when a new version is released.

Extension slugs, labels, order, and visual metadata live in `fssstack-start/app/extension-registry.ts`. Add an entry there and a matching `fssstack/extensions/<slug>.md`: the landing page reads the registry, the schema and CLI accept its slugs, and a test checks that each entry has a source document. The published CLI still needs a new npm version before consumers receive a registry change.

Omitted optional fields use the web form's initial values; description is required. Supply `slug` explicitly when changing `name` in JSON: the default slug remains `my-app`. The CLI accepts normalized values such as the website copies and rejects invalid values instead of guessing. Unknown top-level fields are errors. App and library slugs must be unique across all three lists; this additional rule is checked by Zod because standard JSON Schema cannot express it. The generated prompt includes the shared default prerequisite paragraph.

Output goes only to stdout, with one trailing newline. Errors go to stderr and exit with status 1. Shell redirection controls files. The CLI never scaffolds projects or installs anything. `--help` and `--version` are also available.

## HelloWorld

Save this as `project.json` (also available in `examples/hello-world.json`):

```json
{
  "name": "HelloWorld",
  "slug": "hello-world",
  "emoji": "👋",
  "description": "A workspace for sharing greetings around the world.",
  "packagePrefix": "@hello-world",
  "shadcnPreset": "b1a1M7Tvs",
  "extensions": [
    "clerk",
    "mongodb"
  ],
  "backendServices": [
    "api",
    "worker"
  ],
  "frontendClients": [
    {
      "slug": "web",
      "type": "react-vite"
    },
    {
      "slug": "admin",
      "type": "react-nextjs"
    },
    {
      "slug": "docs",
      "type": "react-fumadocs"
    }
  ],
  "libraryPackages": [
    "sdk",
    "shared"
  ]
}
```

```sh
fssstack prompt < project.json > prompt.md
```

## Development

```sh
pnpm -C fssstack-cli install --frozen-lockfile
pnpm -C fssstack-cli typecheck
pnpm -C fssstack-cli test
pnpm -C fssstack-cli pack --pack-destination /tmp
node fssstack-cli/dist/cli.js schema
node fssstack-cli/dist/cli.js prompt < fssstack-cli/examples/hello-world.json
```

The build bundles the shared web sources. Published runtime dependencies are only `yaml` and `zod`; Next.js and the authoring checkout are not needed by consumers. Tests check exported JSON Schema using a standard validator, shared defaults, exact web prompt parity, stdin and argument input, and validation failures. Run the web tests, lint, and build when changing shared sources.

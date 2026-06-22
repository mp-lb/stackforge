# Publishing Internal NPM Packages

How we publish MAP Lab internal npm packages to GitHub Packages. Use this for
packages that another repo must consume, such as a backend tRPC contract package
used by a standalone React Native app.

This is a guide, not canon yet. It is intentionally close to the existing
Fssstack Changesets release shape, but swaps npmjs publishing for GitHub
Packages.

## Model

- Package names use the normal MAP Lab scope: `@mp-lb/<project>-<package>`.
- Packages publish to GitHub Packages at `https://npm.pkg.github.com`.
- Publishing from the owning repo uses `GITHUB_TOKEN` with `packages: write`.
- Local installs and cross-repo installs use `NODE_AUTH_TOKEN`.
- Publishing repos commit registry routing only when needed; consumer repos commit
  a token-free `.npmrc` that reads `${NODE_AUTH_TOKEN}`.
- Private tokens never go in `.npmrc`, `package.json`, or workflow YAML.

GitHub's npm registry only supports scoped packages. It can publish with
`GITHUB_TOKEN` from the owning workflow, while local installs and installs from
other private repos need a token with package read access unless package access
has been granted to that repo.

Reference:

- <https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry>
- <https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages>

## Owning Package Setup

In the package that will be published:

```json
{
  "name": "@mp-lb/example-trpc",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "prepack": "pnpm build"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/mp-lb/example.git"
  }
}
```

Rules:

- Export only code that is safe for the consumer runtime.
- A mobile-facing tRPC package should export types and client helpers, not
  server-only implementations, environment loading, database clients, or Node-only
  utilities.
- Keep `files` narrow. The published tarball should normally be `dist`,
  `README.md`, and package metadata.
- Include a `repository` field so GitHub can connect the package to the owning
  repo and inherit permissions.

For the root or package-level `.npmrc` in the publishing repo, add registry
routing only if the repo needs local package-manager commands to know about
GitHub Packages:

```ini
@mp-lb:registry=https://npm.pkg.github.com
```

Do not commit an auth line in the publishing repo unless the repo also consumes
private GitHub Packages during local install. The release workflow gets its
runner auth from `actions/setup-node` and `NODE_AUTH_TOKEN`.

## Changesets Setup

Use the normal Fssstack Changesets flow:

```bash
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

The steady-state workflow should run on `main`, detect pending changesets,
version packages, validate, publish, then push the release commit and tags.

Important: do not point the whole `@mp-lb` scope at GitHub Packages during
install if the repo also depends on `@mp-lb/*` packages that still live on npmjs.
Install from the normal registry, then add GitHub Packages auth only for the
publish step.

For GitHub Packages the important workflow differences from the npmjs shape are:

```yaml
permissions:
  contents: write
  packages: write

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: pnpm

  - run: pnpm install --frozen-lockfile

  - run: pnpm --filter <package-name> build

  - name: Publish
    run: |
      printf "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n" > "$RUNNER_TEMP/npmrc"
      NPM_CONFIG_USERCONFIG="$RUNNER_TEMP/npmrc" pnpm --filter <package-name> publish --no-git-checks --registry=https://npm.pkg.github.com
    env:
      NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Use `GITHUB_TOKEN` for packages published from the same repository. Only use a
classic personal access token for publishing when the workflow must publish to a
different owner/repository than the one running the workflow.

## First Publish

The first publish can be done by CI as long as the workflow has `packages: write`
and the package has a GitHub Packages registry mapping. If the workflow is not
ready yet, do one manual first publish from the package directory:

```bash
export NODE_AUTH_TOKEN=<classic-pat-with-write-packages>
pnpm --filter <package-name> build
cd packages/<package>
npm publish
```

After the first publish, use Changesets and CI for every version.

## Local Consumer Setup

This is mostly for standalone consumer repos, such as a React Native app that
installs a package published by the main Fssstack repo. The publishing Fssstack
repo may not need any local install auth at all.

In a repo that installs the package, commit `.npmrc`:

```ini
@mp-lb:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

The auth line is safe to commit because it contains an environment-variable
reference, not a literal token. Then install with:

```bash
export NODE_AUTH_TOKEN=<classic-pat-with-read-packages>
npm ci
```

For local development, put the token in the project's gitignored `.env`:

```dotenv
NODE_AUTH_TOKEN=github_pat_...
```

For Fssstack projects, run package-manager commands through Zap so the normal
Zapper environment loading passes `NODE_AUTH_TOKEN` through. For example:

```bash
zap task install
```

For standalone React Native repos, use the same local secret convention: keep
`.env` gitignored, load it before `npm ci`, and use `npm` plus `package-lock.json`
unless there is a React Native-specific reason to do otherwise. If the repo does
not yet have a Zap wrapper, add one or use an equivalent dotenv loader so local
installs do not depend on a manually exported shell variable.

## CI And EAS Consumers

For a consumer GitHub Actions workflow, prefer granting the consumer repository
read access to the package and using `GITHUB_TOKEN`. If that is not available or
the consumer is outside the package's access boundary, use a read-only classic PAT
as `NODE_AUTH_TOKEN`.

For EAS, add the same read-only token as an EAS secret:

```bash
eas secret:create --scope project --name NODE_AUTH_TOKEN --value <token>
```

Consumer CI and EAS installs should fail fast if `NODE_AUTH_TOKEN` is missing.
Keep the `.npmrc` committed so local, CI, and EAS installs use the same registry
routing.

## Automation Checklist

- [ ] Package has a scoped `@mp-lb/*` name and `private: false`.
- [ ] Package has `exports`, `types`, `files`, `build`, and `prepack`.
- [ ] Package has `publishConfig.registry` set to GitHub Packages.
- [ ] Package has a `repository` field pointing at the owning GitHub repo.
- [ ] Publishing repo has committed registry routing for `@mp-lb` only if needed.
- [ ] Changesets config does not ignore the package.
- [ ] Release workflow uses `permissions.packages: write`.
- [ ] Release workflow publishes with `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.
- [ ] Local install works with `NODE_AUTH_TOKEN` from gitignored `.env` and no
  literal token in committed files.
- [ ] Consumer repo has a committed token-free `.npmrc`.
- [ ] Consumer CI/EAS can install with either granted package access or a read-only
  `NODE_AUTH_TOKEN`.

## Validation

Before publishing:

```bash
pnpm --filter <package-name> build
pnpm --filter <package-name> pack --dry-run
```

After publishing:

```bash
npm view <package-name> version --registry=https://npm.pkg.github.com
npm view <package-name>@<version> dist.tarball --registry=https://npm.pkg.github.com
```

Then verify from the consumer repo:

```bash
export NODE_AUTH_TOKEN=<read-token>
npm ci
node -e "import('<package-name>').then(() => console.log('ok'))"
```

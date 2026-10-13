# Validation record

Validated from this reference root on 13 October 2026:

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
node scripts/verify-provenance.mjs --stackforge-root <verified-stackforge-root>
```

All commands passed. The Fumadocs build emitted upstream CSS and browser-module
warnings but completed successfully.

Clerk credentials and a live MongoDB container were intentionally not supplied:
the reference verifies their dependency, configuration, and code wiring without
calling either external service.

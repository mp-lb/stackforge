## Frontend

Use shadcn/ui consistently for supported UI patterns. Reuse installed components before creating anything new; when a suitable component is missing, install it through the CLI rather than hand-building a substitute. Use the existing `cn` utility for conditional classes.

Run these commands from the frontend package containing `components.json`:

```sh
pnpm dlx shadcn@latest list @shadcn
pnpm dlx shadcn@latest search @shadcn -q dialog
pnpm dlx shadcn@latest add dialog
```

`components.json` defines component aliases and the theme CSS location; resolve its `aliases.ui` through the app's TypeScript aliases to find installed components. Review existing files before installation and preserve local customizations; do not blindly use `--overwrite`.

Use the shared theme tokens and existing component variants for colors, typography, spacing and radii. UI consistency takes priority over making one screen look different. Do not override theme-owned styles in individual components without a concrete reason; make intentional design-system changes at the shared theme or component level.

CLI reference: https://ui.shadcn.com/docs/cli.

### Loading UI

When the Shad augmentation is installed, use its `FullScreenLoading` and dot-matrix loader for full-screen application/session readiness and root Suspense gates. Keep inline loaders inline and preserve the project theme. Electron offline recovery must use packaged assets, independently of the hosted frontend.

Read `fm read shad.md --store mp-lb/augmentations` for registry installation and verification.

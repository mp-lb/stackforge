# Shad augmentation

## When to use

Apply to each React frontend after the FSS Stack setup initializes shadcn/ui
and Tailwind. This is the MAP Lab loading-screen baseline for web and Electron
renderers. Skip projects without a React frontend.

## Install

Run from the frontend package (for example, `apps/frontend` or `apps/web`):

```sh
pnpm dlx shadcn@latest add https://shad.mp-lb.dev/r/ui-states.json
```

This installs `FullScreenLoading`, the standard dot-matrix loaders, their local
CSS, and the UI-state primitives. Keep the existing shadcn preset and theme.
The command can be rerun to ensure the files are present: preserve customized
components such as `button` when prompted. If UI states were installed before
`FullScreenLoading` was added, install the missing file and review upstream
diffs before replacing existing files; do not blindly use `--overwrite`.

## Application loading

Use the shared full-screen component while the app or authentication session
is becoming ready, before choosing signed-in or signed-out content:

```tsx
import { FullScreenLoading } from "@/components/ui-states/full-screen-loading";

if (!isLoaded) return <FullScreenLoading label="Loading session" />;
```

It fills the viewport with the app's theme background and centers the standard
18px dot-matrix spinner in the muted foreground color. The label is for screen
readers only. Do not render visible “Loading <app>…” text or a different spinner.
Use the same component for any root Suspense fallback and full-screen startup
workspace gate. Keep it eagerly imported and under the theme provider. Inline
content loaders remain inline; do not replace them with viewport-sized states.

This is a React readiness screen, not a pre-JavaScript splash or a network
failure fallback. Keep the initial HTML theme background consistent with the
application, and keep Electron's offline recovery independent of hosted assets.

## Verify

Run the project's checks and frontend build. Confirm that delayed session
readiness renders this screen before either sign-in or application content.
Check light/dark themes, reduced motion, viewport centering, and its accessible
loading label. New projects and existing consumers use this same registry
component rather than maintaining an app-specific loading-screen copy.

## Agent context

Import the shared UI context remotely in `context/index.md`. Keep project-specific loading-screen instructions locally, then run `zap task context-build` and commit source and generated files together.

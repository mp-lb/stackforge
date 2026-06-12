# Guides

The **advisory** tier. Each guide has a strong default path, but real variance
leaks in (the application, the framework choice, n=1 history), so **deviation is
expected and fine**. Contrast with the **canon** tier — `fssstack/` (template +
extensions) — which is prescriptive and followed to a tee, where deviation is a
bug. (Deployment canon is Zap Arc / ArcNet, outside this repo; `mp-lb-run/` is a
tombstone.)

Most guides are a **single file** here. A guide gets its **own subfolder** only
when it outgrows one file — i.e. it carries `snippets/`, sub-docs, or living state.

## Guides

- **[electron/](./electron/)** — Electron desktop apps (folder: carries the release-workflow templates). Documents the **release pipeline only**; the build/app side is an explicit, written-down gap. Native macOS lives here as a parked appendix.
- **[clerk.md](./clerk.md)** — Clerk auth setup choices and CLI-assisted setup.
- **[security.md](./security.md)** — security practices (blank canvas — nothing exists yet).
- **[publishing.md](./publishing.md)** — publishing npm packages via CI. A pointer-guide: the substance is canon (`fssstack/standards/*`) and is **referenced, not copied**.
- **[react-native/](./react-native/)** — standing up an Expo mobile app and getting it published (folder: carries `snippets/` + an inputs interpolation script). Three short guides — `INPUTS.md` (front-loaded console work), `SETUP.md`, `BOOTSTRAP.md` (first deploy) — with `SETUP_REACT_NATIVE.md` as the deep reference. Publishing is the one strong-default spine (there's only one way onto the stores); auth, structure, and everything else is "here's how you might do it."
- **[observability/](./observability/)** — OTel + Sentry + reliability (folder: carries the recipe + per-project rollout state).

## On graduation

A guide isn't necessarily a guide forever. Some **harden into canon** as patterns
prove out — **publishing** is the candidate (changesets + `publish.yaml` is nearly
deterministic; only the unsolved secrets story keeps it advisory). Others —
**observability** especially — never graduate, because they genuinely depend on the
app. "It's a guide" sometimes just means "we haven't earned the right to make it
canon yet."

## On frequency

Some guides get followed far more often than others. That's expected and **not
modeled** — frequency and prescriptiveness are different axes, and only
prescriptiveness (canon vs. guide) earns structure here.

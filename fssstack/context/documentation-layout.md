## Documentation layout

This project's docs live under `docs/` with a fixed layout — keep to it:

- **Root = project surface.** Only top-level, act-on-it files belong at the root
  of `docs/`: `README.md`, `STORY.md`, the task board (`*.board.json`), and any
  studies/positioning you want at eye level. Don't drop loose docs here.
- **`docs/internals/` = this project's own docs.** Every system/engineering doc —
  feature docs, architecture notes, setup runbooks, how-things-work explainers —
  lives here. When you write a doc about how something works, it goes in
  `docs/internals/`, never loose at the root.
- **Shared standards and extensions** live in Forum. Read them directly from
  `mp-lb/dev` and `mp-lb/fssstack` respectively.
- **`docs/public/`** *(libraries only)* — the opt-in published surface the docs
  site renders (see `fm read libs.md --store mp-lb/dev`). Everything else in `docs/` is
  unpublished by default.

The project documentation block states whether `docs/` syncs to a dedicated
Forum store. Do not copy shared standards or extensions into it.

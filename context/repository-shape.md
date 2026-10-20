## Repository Shape

The root of this git repo should stay thin. It owns the FSS Stack source content:

- `fssstack/` is the Forum content and shell for creating FSS Stack target projects.
- `arcnet/` owns opt-in deployment onboarding and non-secret network config; the engine stays in Zapper and operator credentials remain outside Git.
- `fssstack-mobile/` owns mobile setup and release guidance.

[`fssstack-start`](https://github.com/mp-lb/fssstack-start) is a separate
downstream repository. It owns the configurator and CLI, and depends on this
project's FSS Stack setup contract. When changing the basic project inputs in
`fssstack.yaml`, keep that repository in sync; do not add it back to this
checkout.

Do not turn the repository root into an npm project. Run package-manager
commands from the owning subproject.

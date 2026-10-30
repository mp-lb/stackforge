## Delivery

For packages intended for public npm, changes reaching `main` on GitHub trigger the release workflow. It compares packed package contents with the latest npm version and publishes changed packages. Configure `NPM_TOKEN` or npm trusted publishing before relying on the workflow, and check its run to confirm publication. A package's first publication may require an authenticated local publish, depending on the npm authentication setup.

Package manifests select what is published: use `private: true` for internal workspace packages and `private: false` with `publishConfig.access: public` for packages intended for npm. The publisher scans direct children of `apps/` and `packages/`; a missing `private` field also makes a named package eligible. This guidance is inactive when there are no publishable npm packages.

FSS Stack alone does not configure application deployment. Add project-specific deployment instructions here when a deployment provider is configured.

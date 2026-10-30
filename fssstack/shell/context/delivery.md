## Delivery

FSS Stack alone does not configure application deployment. Describe actual deployment services and workflow triggers here when a provider is added.

For public npm packages, the shell's release workflow compares packed package contents and publishes changed eligible packages when changes reach `main` on GitHub. Use `private: true` for internal packages and `private: false` with `publishConfig.access: public` for public packages. The publisher scans immediate children of `apps/` and `packages/`; a missing `private` field also makes a named package eligible.

Configure publishing authentication before relying on the workflow, retain any first-publication prerequisites, and check the workflow run to confirm publication. This publishing guidance is inactive when no packages are publishable.

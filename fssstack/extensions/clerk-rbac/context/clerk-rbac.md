## Clerk authorization

This project adds role-based authorization to Clerk authentication. Reuse the configured role schema, verified session claims and application access checks. Backend procedures enforce permissions before privileged Clerk operations; frontend visibility is not authorization.

Trusted backend code writes Clerk role metadata and updates any local role snapshot only after Clerk succeeds. Session claims can remain stale until token refresh. Follow the configured revocation flow for urgent access changes. Do not introduce example role names or alternative fallback rules without checking the project's current model.

Setup and updates: `fm read extensions/clerk-rbac/README.md --store mp-lb/fssstack`.

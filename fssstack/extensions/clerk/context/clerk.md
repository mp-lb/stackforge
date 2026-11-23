## Clerk

This project uses Clerk for authentication. Use the provider and SDK already installed in each app. Keep verification at the backend request boundary and expose verified app-owned auth fields to procedures; do not trust identity supplied by the browser.

Keep `CLERK_SECRET_KEY` server-side. Frontend publishable configuration is non-secret. Use the actual Zapper frontend URLs for local redirect configuration. Follow the project's existing sign-in, session-readiness and callback flow when adding routes.

Setup and updates: `fm read extensions/clerk/README.md --store mp-lb/fssstack`.

### Clerk account setup

For projects using the MAP Lab Clerk account setup, follow the Clerk augmentation for account/instance and social-login setup. Preserve the project's configured authentication method and readiness UI. Diagnose provider errors from their actual error codes and callback configuration. Read `fm read clerk.md --store mp-lb/augmentations` before changing organization-specific setup.

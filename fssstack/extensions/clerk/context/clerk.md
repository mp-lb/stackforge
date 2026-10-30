## Clerk

This project uses Clerk for authentication. Use the provider and SDK already installed in each app. Keep verification at the backend request boundary and expose verified app-owned auth fields to procedures; do not trust identity supplied by the browser.

Keep `CLERK_SECRET_KEY` server-side. Frontend publishable configuration is non-secret. Use the actual Zapper frontend URLs for local redirect configuration. Follow the project's existing sign-in, session-readiness and callback flow when adding routes.

Setup and updates: `fm read extensions/clerk/README.md --store mp-lb/fssstack`.

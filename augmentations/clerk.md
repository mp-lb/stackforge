# Clerk augmentation

## When to use

Apply this after the [FSS Stack Clerk extension](../fssstack/extensions/clerk.md) has added Clerk to the code.

## Instance setup

- Create the Clerk development and production instances using the Clerk CLI. Run `pnpm dlx clerk@latest doctor --json` first and target the application and instance explicitly.
- Store each Clerk secret in the appropriate encrypted project secrets file in Forum. Sync the ArcNet snapshots after changes.
- Keep our store locations, contact defaults, and provider setup conventions in this augmentation, not in public tooling.

## Sign-in methods

Configure each provider separately for development and production. Enabling a button is not proof that a production connection works.

### Google

Development uses Clerk's shared Google credentials. Production needs an app-specific Google Web application OAuth client, with its client ID and secret configured in Clerk.

#### GCP project

Reuse the GCP project recorded in the application's ArcNet configuration and variable snapshots. Do not derive a replacement from a renamed display name. Berth currently uses `arcnet-factory`, retained from its original `factory` slug; do not create `arcnet-berth` for the same deployment.

For a new application with no configured project, choose `arcnet-<project-slug>`, then create it only if missing. Run with the organization's authenticated GCP account; add the appropriate `--organization` or `--folder` to creation when required. Billing and deployment provisioning remain part of ArcNet setup.

```sh
set -euo pipefail
GCP_PROJECT_ID='arcnet-example' # Use the configured ID when one exists.
existing_project=$(gcloud projects list \
  --filter="projectId=$GCP_PROJECT_ID" --format='value(projectId)')
if [ -z "$existing_project" ]; then
  gcloud projects create "$GCP_PROJECT_ID" --name="$GCP_PROJECT_ID"
fi
gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectId,lifecycleState)'
```

Require `ACTIVE` before continuing. Stop on authentication, permission, or project-ID collision errors; do not silently choose another ID.

#### Google Auth Platform

Configure branding and create the client in the [Google Cloud Console](https://console.cloud.google.com/auth/overview). Google's documented standard OAuth setup is a Console operation. `gcloud iam oauth-clients` manages Workforce Identity Federation clients and is not a substitute for Google sign-in. Do not automate private Console APIs.

| Setting | Default |
| --- | --- |
| App name | The product's current display name |
| User support email | `support@mp-lb.dev` |
| Developer contact email | `privacy@mp-lb.dev` |
| Audience | External, unless the product explicitly restricts access to our Workspace |
| Authorized domain | The verified parent domain of the app and Clerk hosts, such as `mp-lb.dev` |
| Scopes | `openid`, email, and profile only for basic sign-in |
| Client type | Web application, including Electron apps that sign in through a browser and Clerk |

Google restricts which support addresses can be selected. Ensure the operator is eligible to use the configured mailbox or Google Group; do not invent an address or silently substitute one. Use real, published home, privacy-policy, and terms URLs when requested. `privacy@mp-lb.dev` is a contact address, not a privacy-policy URL.

1. Configure Branding, Audience, and Data Access. In Testing, add the intended test users. Before general release, publish the audience and complete any verification Google requires.
2. Create or reuse the project's Web application client. Add the real frontend origin under authorized JavaScript origins, and copy the exact OAuth redirect URI from the production Clerk Google connection into authorized redirect URIs.
3. Download the client JSON into an ignored local file. Keep a backup in the project's encrypted Forum secrets, preserving existing encryption recipients. Never put the client secret in browser environment variables or commit the downloaded JSON.

For Berth: origin `https://app.berth.mp-lb.dev`, redirect `https://clerk.berth.mp-lb.dev/v1/oauth_callback`, project `arcnet-factory`.

#### Configure Clerk

Use `pnpm dlx clerk@latest config schema --keys connection_oauth_google` to confirm the current schema. Prepare a private JSON patch from the downloaded Google's `web.client_id` and `web.client_secret`:

```json
{
  "connection_oauth_google": {
    "enabled": true,
    "authenticatable": true,
    "client_id": "<web.client_id>",
    "client_secret": "<web.client_secret>"
  }
}
```

Save it to an ignored file with mode `0600`; pass its path, not the credentials, on the command line. Set `CLERK_APP_ID` and `CLERK_PATCH_FILE` to the intended application and private patch file. Use PATCH to preserve unrelated configuration. Preview before applying; suppress output because the preview or response can contain credentials.

```sh
pnpm dlx clerk@latest config patch --app "$CLERK_APP_ID" \
  --instance prod --file "$CLERK_PATCH_FILE" --dry-run >/dev/null
pnpm dlx clerk@latest config patch --app "$CLERK_APP_ID" \
  --instance prod --file "$CLERK_PATCH_FILE" --yes >/dev/null
```

Delete temporary plaintext files after the encrypted backup and Clerk update are verified. Project creation/reuse and Clerk configuration are automatable; creating the Google consent screen and standard Web OAuth client is the manual handoff.

#### Verify

- Read back the production connection and check enabled/authenticatable and credential presence without printing secrets.
- Complete a real Google sign-in on the deployed app. For Electron, also verify browser-to-app handoff.
- If Google blocks access, record its specific error code: missing/incorrect credentials, redirect mismatch, Testing audience restrictions, organization restrictions, and embedded browsers require different fixes. Do not treat every authorization error as a missing project.

References: [Clerk Google setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google), [Google consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent), [Google OAuth client management scope](https://docs.cloud.google.com/iam/docs/workforce-manage-oauth-app).

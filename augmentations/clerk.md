# Clerk augmentation

## When to use

Apply this after the [FSS Stack Clerk extension](../fssstack/extensions/clerk/README.md) has added Clerk to the code.

## Instance setup

- Create the Clerk development and production instances using the Clerk CLI. Run `pnpm dlx clerk@latest doctor --json` first and target the application and instance explicitly.
- Store each Clerk secret in the appropriate encrypted project secrets file in Forum. Sync the ArcNet snapshots after changes.
- Keep our store locations, contact defaults, and provider setup conventions in this augmentation, not in public tooling.

## Sign-in methods

Configure each provider separately for development and production. Enabling a button is not proof that a production connection works.

### Google

Development uses Clerk's shared Google credentials. Production needs an app-specific Google Web application OAuth client, with its client ID and secret configured in Clerk.

#### Agent: prepare the project

Reuse the GCP project recorded in the application's ArcNet configuration and variable snapshots. Do not derive a replacement from a renamed display name. Berth uses `arcnet-berth`.

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

#### Manual: configure Google and create the client

**This step must be done by the human in Google Cloud Console. There is no supported `gcloud` command for this standard Google sign-in client.** `gcloud iam oauth-clients` is for Workforce Identity Federation. Do not substitute it or automate private Console APIs.

Before handing off, the agent must provide a filled-in checklist: project ID, project-specific Branding and Clients links, app name, contact emails, authorized domain, frontend origin, and the exact redirect URI from the production Clerk connection. Resolve the values first; do not send placeholders or ask the human to discover them. Explain that the human returns only the local path of the downloaded JSON file, never the client secret in chat.

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

The human follows these steps:

1. Open the supplied Google Cloud Console link and confirm the selected project ID.
2. Open **Google Auth Platform → Branding**. If prompted, click **Get started**. Enter the supplied app name, user support email, audience, and developer contact email; acknowledge Google's terms and create the configuration.
3. Complete **Branding** with the supplied authorized domain and real homepage, privacy-policy, and terms URLs where requested. If the support email is not selectable, tell the agent rather than substituting an unrelated address.
4. Under **Audience**, use **External** for public products. While in **Testing**, add the Google accounts that will test sign-in. Before general release, use **Publish app** and complete any verification Google requires.
5. Under **Data Access**, use only the basic sign-in scopes: OpenID, email, and profile.
6. Open **Clients → Create client**, choose **Web application**, and give it the supplied app name. If an appropriate client already exists, edit it instead of creating a duplicate.
7. Under **Authorized JavaScript origins**, add the exact frontend origin supplied by the agent. Under **Authorized redirect URIs**, add the exact Clerk callback supplied by the agent. These are different fields; do not interchange them.
8. Click **Create** and download the client JSON while it is available. Save it to the ignored local location agreed with the agent. Do not paste the secret into chat or commit the file.
9. Send the agent the file's absolute local path. The agent handles the Clerk configuration and encrypted backup below.

**Handoff complete:** the JSON contains the Web client's ID and secret, and the human has supplied its local path. Until then, report Google production setup as blocked on this manual step; do not claim sign-in is configured.

For Berth: origin `https://app.berth.mp-lb.dev`, redirect `https://clerk.berth.mp-lb.dev/v1/oauth_callback`, project `arcnet-berth`.

#### Agent: configure Clerk and store credentials

After the human supplies the downloaded JSON path, validate that it belongs to the intended GCP project and contains the expected redirect URI. Back up the credentials in the project's encrypted Forum secrets while preserving existing values and recipients. Never put the client secret in browser environment variables.

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

## Agent context

After applying this augmentation, copy `context/maplab-clerk.md` from `mp-lb/augmentations` into the project's `context/maplab-clerk.md`, merge any existing customizations, and adapt it to the features actually installed:

```sh
set -e
fm read context/maplab-clerk.md --store mp-lb/augmentations > context/maplab-clerk.md
grep -qxF '@maplab-clerk.md' context/index.md || printf '\n@maplab-clerk.md\n' >> context/index.md
zap task context-build
```

The write command is for first installation; compare and merge on updates. Commit the block and generated agent files with the capability changes.

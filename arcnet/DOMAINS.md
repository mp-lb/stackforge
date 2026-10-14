# ArcNet domain management design

**Status:** project domain commands and a domain map are proposed, not implemented. Today `zap.yaml` service `domain` fields are authoritative; setup may copy initial values from `.arcnet/services.json`. Editing a separate file after setup does not change a deployment.

## Defaults and explicit routes

For the common web + API shape, a project should start with `<slug>.mp-lb.dev` for the frontend and `api.<slug>.mp-lb.dev` for the API. A dedicated base domain can use the same pattern. These are defaults, not constraints: a project may bind any verified hostname to any supported service.

The eventual source of truth should be one committed `.arcnet/domains.json` map. Each entry identifies the hostname, target service, hosting provider, and whether it is the primary address or an alias. ArcNet should generate provider mappings and owned DNS records from that map, rather than retaining independent copies of the same hostname in the map and `zap.yaml`. Application URLs and external callbacks need explicit references so a domain change can be audited.

A path such as `example.com/api` needs a router that owns `example.com`; a Cloud Run domain mapping alone cannot route one path to a different service. Low-level commands should reject path routes until a supported gateway or project-owned router is declared. High-level presets may generate the common web/API bindings without limiting explicit low-level configuration.

## Command behavior

- `arcnet domain add <hostname> --service <name>` should validate domain ownership, target service, provider support, and conflicts, then change the committed domain map. A primary/alias choice should be explicit when a service has multiple hostnames.
- `arcnet domain plan` should show provider mappings, DNS records, redirects, and known application references that would change before any cloud action.
- `arcnet domain remove <hostname> --replace-with <hostname>` should refuse to retire a primary or referenced hostname without a working replacement. It should stage reference changes first, verify the replacement's DNS, TLS, and service health, then remove only the mapping and DNS records ArcNet owns. An alias with no references may not need a replacement.
- `arcnet domain audit` should find drift and stale references in ArcNet config, service environment values, and declared external integrations. Unknown external callbacks cannot be safely deleted by guessing; the command should surface them for review.

The base-domain ownership proof belongs to the environment and must remain while any project uses a subdomain. `arcnet environment domain-owner` already delegates an existing verified base domain to a deploy service account; it is not a project route command. Project removal must never unverify the base domain or remove another project's DNS.

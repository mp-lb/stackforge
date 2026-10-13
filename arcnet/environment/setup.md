# Set up a new ArcNet environment

An ArcNet environment is the company-owned infrastructure and configuration that projects deploy into. Create it once, then onboard projects through the [project setup guide](../SETUP.md). A different company supplies its own accounts, billing, domain, network configuration and credentials; it does not reuse MAP Lab's identifiers or secrets.

**Status:** this is a setup runbook and a specification for the missing automation. `zap arc bootstrap` implements part of the GCP bootstrap today. Full environment infrastructure as code, environment teardown, shared Redis/Bull hosting and a domain-map generator are not implemented. No cloud changes are performed by reading or applying the project extension alone.

## Location and ownership

`stackforge/arcnet/environment/` owns this guide and all future environment bootstrap, setup, health-check, inventory/analysis and teardown scripts, along with their infrastructure definitions and tests. These are environment-level operations, not application Zap tasks. Project installation remains in `arcnet/setup.mjs` and [the project setup guide](../SETUP.md).

Only this guide exists here today; the environment scripts have not been implemented. Keep actual credentials and private company configuration outside this public source folder and pass their locations explicitly. New tooling must not depend on an implicit `~/.config/zap-arc` pointer. The existing Zap bootstrap is described below as legacy behavior, not the intended entry point.

## Environment inputs

Collect these before provisioning. Organization slugs identify provider accounts; the environment slug identifies this ArcNet installation; application project slugs identify apps within it. They are separate values.

| Input | Meaning / required value |
| --- | --- |
| Environment slug | `arcnet` for MAP Lab; configurable for another installation |
| GCP project ID | Exactly `<environment_slug>` — `arcnet` for the requested MAP Lab environment; no company or application prefix |
| Provider accounts and organization slugs | Explicit GitHub organization, Vercel team slug/account ID, Cloudflare account/zone IDs and Atlas organization/project IDs; provider slugs are not interchangeable with numeric/opaque IDs |
| GCP parent and billing | Organization/folder ID where applicable, billing account ID and authorized bootstrap identity |
| Location | GCP region and any required worker zone; other provider regions as applicable |
| DNS | Owned base domain (for example `arc.mp-lb.dev`) and the authoritative Cloudflare zone |
| External MongoDB and Redis | Manually provisioned cluster/instance identifiers, connection details and scoped access; these remain outside environment creation/destruction |
| Secrets source | Explicit path to the company's encrypted JSON credential source and its approved loader; no real tokens in committed examples |
| State and recovery | Globally unique state-bucket name, state locations and backup/retention choices |
| Project access | GitHub repositories allowed to deploy, project slugs and required provider scopes |

**Naming rule:** `gcp_project_id = environment_slug`. GCP project IDs must satisfy Google's naming rules, be globally unused, and cannot be reused after permanent deletion. `arcnet` is the requested value, not a verified available ID. If unavailable, fail with a clear explanation and require an explicitly chosen different environment slug; do not silently append a suffix. Rebuilding after project deletion requires a new slug/ID. See [project ID constraints](https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects) and [deletion/reuse rules](https://docs.cloud.google.com/resource-manager/docs/delete-restore-projects).

**Intended GCP boundary:** one GCP project per ArcNet environment, containing its GCP infrastructure and application workloads, with application-slug names, labels and scoped access. This is not the current implementation: today's configuration uses a network project plus a GCP project per application. The existing `network.yaml` template and project factory must be adapted before the new naming/boundary can be used; this document does not migrate existing infrastructure.

## The layers

| Layer | Owns | Created when |
| --- | --- | --- |
| Provider accounts | Company identity, billing, domain ownership and initial administrative access | Before bootstrap |
| ArcNet environment | Network GCP project, Terraform state storage, shared MongoDB, DNS conventions and credential distribution | Once per company/environment |
| Project infrastructure | Cloud Run/Vercel services, current per-project Redis/workers/S3, database bindings and CI identity | On project onboarding and updates |
| Application runtime | App configuration, database/queue namespaces and scoped connection credentials | Injected into each selected app |
| Delivery | GitHub workflow that builds and deploys committed project configuration | Every push to main after onboarding |

## 1. Accounts and inputs

Create the accounts and choose billing/owners before running provisioning tools. These are external prerequisites, not resources a bootstrap script can assume it may create with no credentials.

| Provider | Prepare | Used for |
| --- | --- | --- |
| GitHub | Company organization, repositories, Actions access and protected deployment environments | Source, CI and OIDC identity |
| Google Cloud | Organization/folder where applicable, billing account, project quota and bootstrap operator | Terraform state, Cloud Run, image registry, current worker VMs and CI federation |
| Cloudflare + domain registrar | Owned domain, active authoritative DNS zone, zone/account IDs and scoped API token | DNS for project hostnames |
| MongoDB Atlas | Organization/project, shared cluster, cluster host and management API access | Shared MongoDB with project database users |
| Vercel | Explicit team/personal account, billing and token | Websites and frontends |
| Upstash | Account email and Developer API key, if Redis is selected | Current per-project Redis provisioning |
| AWS | Account and scoped provisioning access, only if S3 is selected | Object storage |

Copy [network.yaml](../network.yaml) into an environment-owned configuration location. Replace all company-specific values, not just `REPLACE_` entries: name, GCP project prefix, network project, billing account, regions, DNS zone, state bucket, registry pattern and Atlas facts. Decide backup/retention policy and who owns the environment. The template's `mp-lb` names are not defaults for another company.

Install Node 22+, the pinned ArcNet dependencies, Terraform 1.15.6, gcloud and Docker where container builds are required. Vercel CLI is pinned by the deployment templates. Cloudflare/Atlas/Upstash provisioning can use Terraform providers or their APIs; a separate CLI for every provider is not necessary.

## 2. GCP foundation, identities and APIs

Keep three identities distinct:

- **Bootstrap operator:** creates the environment and establishes initial trust. This can initially be an authenticated human using gcloud and Application Default Credentials (ADC).
- **Infrastructure deployer:** runs Terraform. A dedicated environment automation identity is the intended bootstrap automation design; current project onboarding creates an `arc-deploy` service account in each project's GCP project.
- **Application runtime identity:** runs the app with only its runtime permissions. It must not inherit the Terraform operator's provider credentials.

The bootstrap identity needs permissions at the resources it manages. Typical role families are below; organization policies and selected modules determine the complete grant set.

| Operation | Scope / permission family |
| --- | --- |
| Create GCP projects | Project Creator on the intended organization/folder |
| Link billing | Billing Account User on the billing account plus project billing-assignment permission |
| Enable APIs | Service Usage Admin on the relevant project |
| Create/configure the state bucket | Storage administration on the network project, then appropriate bucket access |
| Create service accounts, WIF and IAM grants | Service-account administration, Workload Identity Pool administration and project IAM administration as needed |
| Provision workloads | Permissions for Cloud Run, Artifact Registry, Compute and the selected modules, including use of their runtime service accounts |

See Google's [project creation permissions](https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects) and [deployment-pipeline federation guide](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines). Prefer short-lived credentials and GitHub OIDC over committing a GCP service-account key.

**Current grants are broader than that design:** the bundled `github-ci` module gives the project deployer Project Editor, Storage Admin on the shared state bucket, Service Usage Consumer on the network quota project and, when configured, Billing Costs Manager on the billing account. It grants GitHub Workload Identity User access based on repository name. A state key prefix is not an IAM boundary; the bucket-wide grant does not isolate projects' Terraform state. Review these grants before adopting the existing modules for another company. Numeric repository/owner identity conditions and narrower state access are improvements still to implement.

### API enablement

Enable APIs in the **network/quota project before bootstrap uses them**, and in workload projects before creating their resources. Do not assume API enablement in one project enables it everywhere.

| Purpose | APIs |
| --- | --- |
| Project creation, billing and API enablement | `cloudresourcemanager.googleapis.com`, `cloudbilling.googleapis.com`, `serviceusage.googleapis.com` |
| Terraform state bucket | `storage.googleapis.com` |
| Cloud Run and container images | `run.googleapis.com`, `artifactregistry.googleapis.com` |
| Current worker VMs / networking | `compute.googleapis.com` |
| Service accounts and CI federation | `iam.googleapis.com`, `iamcredentials.googleapis.com`, `sts.googleapis.com` |
| Billing budgets | `billingbudgets.googleapis.com` when used |

The current bootstrap enables the listed management/workload/IAM APIs except it does not explicitly enable `storage.googleapis.com`; verify Cloud Storage availability before bucket creation. The project factory separately enables Run, Artifact Registry, Compute, Resource Manager, Billing Budgets and the three IAM/federation APIs. Neither list is a promise that organization policies or billing prerequisites have been satisfied.

### Existing bootstrap command (legacy)

Configure the operator's `~/.config/zap-arc/config.yaml` to point to the new environment's `network.yaml` and provider credentials file; the current operator credentials loader uses dotenv. Authenticate gcloud and ADC, then run the installed Zapper's:

```sh
zap arc bootstrap
```

Today this command creates the network GCP project if missing, links billing for a newly created project, enables APIs, creates a GCS state bucket with uniform bucket-level access and versioning, configures Docker authentication and sets the ADC quota project. Supply an explicit billing account; the command otherwise attempts to select an open account. It does not fully reconcile billing/versioning/settings on resources that already exist, and it has no plan/destroy lifecycle for this environment.

The state bucket must exist before Terraform can use it as a backend. Keep it private, recoverable and separate from workload teardown. Terraform's [GCS backend guide](https://developer.hashicorp.com/terraform/language/backend/gcs) documents locking, credentials and recommended object versioning. Current project state uses `terraform/state/<project-slug>` inside the shared bucket.

## 3. Shared data and networking

Provision the Atlas cluster once. Record the Atlas project ID and cluster SRV hostname in environment configuration, then configure application network reachability: an approved IP access list or a private connectivity design with corresponding GCP routing/egress. Management API access and database network access are separate requirements. The existing ArcNet MongoDB module creates users/bindings; it does not configure cluster networking or create the shared cluster.

The current module uses `MONGODB_ATLAS_PUBLIC_KEY` and `MONGODB_ATLAS_PRIVATE_KEY` to manage database users. Give that management identity access to the intended Atlas project. Applications receive database-user connection strings, not Atlas management keys. See [Atlas API authentication](https://www.mongodb.com/docs/atlas/configure-api-access/) for the distinction.

Shared services use the project slug as their namespace and access boundary. MongoDB currently uses a database named for the slug and a user scoped to it. Shared Redis and Bull hosting remain planned; their binding must supply a namespace and scoped access in addition to a URL. Separate credentials/access controls enforce the boundary; a key prefix alone does not.

Today Upstash creates a Redis database per project, using `UPSTASH_EMAIL` and `UPSTASH_API_KEY`. These are management credentials, distinct from the runtime `REDIS_URL`; see [Upstash API authentication](https://upstash.com/docs/devops/developer-api/authentication). Current workers receive separate GCE VMs. A future shared Bull pool also needs a way to register and deploy each project's worker image/code, not just a Redis connection string.

## 4. DNS and service domains

Choose the environment's base domain up front, for example **`arc.mp-lb.dev`**. The authoritative Cloudflare zone might still be **`mp-lb.dev`**; a base hostname and a DNS zone are different things. Configure delegation only if using a separately hosted child zone. Create a Cloudflare token with Zone Read and DNS Edit for the intended zone, using the provider's [token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

**Proposed hostname convention:** `<service>.<project-slug>.<environment-base-domain>`, for example `api.hello-world.arc.mp-lb.dev` and `web.hello-world.arc.mp-lb.dev`. Only publicly addressable services get public domains; databases and Bull workers do not need one by default.

**Proposed project source of truth:** `.arcnet/domains.json`, mapping public service names to hostnames. Omitted overrides would use the environment convention. A generator would resolve this map into deployment configuration and app URLs, with explicit hostnames taking precedence. For example:

```json
{
  "api": "api.hello-world.arc.mp-lb.dev",
  "web": "www.example.com"
}
```

This file and the convention are **not implemented**. Currently the hostname is the service's `domain` in `.arcnet/services.json`, copied into `zap.yaml` at setup. The runner subsequently reads `zap.yaml`; changing the input JSON alone does not update a deployed domain. The default single-backend installer currently uses `<slug>-api.<dns.zone>`. Keep those existing fields authoritative until a domain-map generator is implemented; do not add an ignored JSON file and assume it changes DNS.

DNS records alone are not sufficient: attach each hostname to its hosting provider and complete ownership/TLS verification. Cloud Run's current module uses domain mappings and Cloudflare; follow the [first-deployment requirements](../SETUP.md#before-the-first-live-deployment). Vercel requires the domain to be assigned to the correct project and its requested DNS/verification records, as described in [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain). Vercel-only ArcNet deployment currently does not manage domains. Do not assume a wildcard record or certificate for the environment covers every nested project/service name.

A domain change also needs corresponding application URLs, CORS/auth callbacks and links updated. Plan the new hostname, verify TLS/routing, then retire the old hostname deliberately.

## 5. Secrets: environment source, project delivery, app runtime

Use an encrypted JSON document as the environment's secret source if that is the company's secret-management convention. Decrypt outside Git into the deployment process. Do not put plaintext provider keys in `network.yaml`, `.arcnet/services.json` or the repository. Encryption and delivery are supplied by the company's secret loader; the generic ArcNet workflow does not install such a loader.

| Secret class | Consumer | Examples |
| --- | --- | --- |
| Environment administration | Bootstrap / environment maintenance only | Account-level provisioning credentials |
| Project deployment | That project's protected CI job | Required Cloudflare, Atlas, Vercel, Upstash or AWS management credentials, scoped where possible |
| Application runtime | Only the app needing them | MongoDB/Redis URLs, app secrets and project namespace |

A single centrally maintained JSON source is compatible with this model; giving every project its decrypted contents is not the isolation model. Deliver project-specific subsets/credentials. If every repo holds the same encrypted file and a key that decrypts all of it, filtering variables afterward does not prevent that repo from reading the other secrets.

Current interfaces: Terraform Vercel uses `VERCEL_API_TOKEN`; the static Vercel adapter uses `VERCEL_TOKEN`. Other provider names are in [network.yaml](../network.yaml) and the [workflow](../templates/deploy-arc.yaml). `ARCNET_ENV_JSON` is a JSON object of **application** secret values, not a universal provider-credentials loader. `.arcnet/env.production.json` contains public app values. The proposed JSON-to-project-secret distribution layer still needs implementation; use an existing approved loader where available. GCP CI uses OIDC/WIF, not a shared long-lived service-account key in this JSON.

## 6. Onboard a project and enable push-to-deploy

1. Reserve the project slug, provider destinations, public domains and shared-service namespaces.
2. Install the [project files](../README.md#what-gets-added) using [SETUP.md](../SETUP.md), including application-specific build/Docker settings. Choose existing provider projects explicitly; current mixed Terraform/Vercel-reference limitations still apply.
3. Bind the project to the environment: non-secret network snapshot, project-scoped data access and deployment credentials.
4. Complete initial provisioning with the bootstrap/operator identity. The current Terraform first deployment creates the workload GCP project, image registry and GitHub OIDC trust; CI cannot use that trust before it exists.
5. Configure the GitHub environment, actual WIF provider/service-account values, secret delivery and production approval. Verify a deployment and health/DNS/TLS before treating onboarding as complete.
6. Commit the ready configuration. From then on, pushes to main build and deploy through GitHub Actions.

Account creation, domain ownership, shared infrastructure and the first identity bootstrap are the prerequisites that make step 6 simple. Merely copying project files and supplying arbitrary API keys is not sufficient today.

## 7. Environment infrastructure as code: implementation scope

The environment tooling belongs here in Stackforge, with declarative Terraform resources and CLI/API calls for bootstrap prerequisites. It uses environment state separate from application state. The planned source layout is:

```text
stackforge/arcnet/environment/
├── setup.md                     This guide and input contract
├── infrastructure/              Environment Terraform definitions (planned)
├── scripts/                     Setup, checks, analysis and teardown (planned)
└── tests/                       Environment lifecycle tests (planned)
```

Supply the company-specific configuration and encrypted secrets from an explicit external location. They are inputs to this tooling, not files to commit under Stackforge. MongoDB and Upstash are provisioned manually and treated as referenced resources; environment teardown must preserve them.

The required lifecycle is **check → bootstrap → plan → apply → export project bindings**, plus **plan teardown → destroy**. These are requirements for a future tool, not existing command names. It must support explicit accounts, dependency ordering, reruns, importing existing resources, an inventory of owned vs referenced resources and recovery after partial failure. Authentication/account signup and provider billing consent remain external prerequisites.

Creation order: accounts/credentials and existing MongoDB/Redis → GCP environment project/APIs → state bucket → environment Terraform state → environment-owned resources → DNS configuration → project access/bindings. A minimal bootstrap state must be preserved or imported once remote state exists; an imperative script must not leave untracked infrastructure behind.

Teardown reverses the dependency order: stop project deploys, remove project workloads/bindings, preserve or explicitly retire data/backups, remove only environment-owned shared resources and DNS records, revoke credentials/trust, then remove the state bucket/network project last. Referenced resources must remain. Environment deletion must not be inferred from `zap arc destroy`: that command destroys the selected **project** state, not this complete environment. There is currently no end-to-end environment teardown command.

Before shipping this lifecycle, prove it on a disposable environment: setup, repeat setup without duplicate resources, onboard hello-world, deploy via GitHub, verify project isolation, exercise partial-failure recovery, and tear down without affecting referenced resources. This document does not claim those environment lifecycle tests have run.

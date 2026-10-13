# Security

Our security practices. **Blank canvas — we don't do any of this yet.** Captured
here so the concern has a home and shows up when we plan work.

## Intended scope (to be filled in)

- **Abuse detection** — rate limiting, bot/abuse signals, account-takeover defenses,
  traffic anomaly detection.
- **Vulnerability scanning** — dependency/SCA (npm audit / Dependabot), container
  image scanning, IaC/Terraform scanning, SAST.
- **Secrets hygiene** — repo/CI secret scanning; ties into our secrets model
  (encrypted file + bootstrap token).
- **Auth & access** — Clerk/RBAC review, least-privilege cloud IAM.
- **Incident response** — what to do when something is found or exploited.

## Status

Nothing implemented. Likely first slice: dependency/vuln scanning in CI (cheap,
high-value).

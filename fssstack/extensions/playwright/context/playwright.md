## Browser tests

This project uses Playwright. Run browser suites through the configured Zap tasks and profiles so service URLs, ports and test data are resolved consistently. Follow the project validation block's rules about when E2E runs are authorized.

Use the existing test package, auth helpers and deterministic seed/cleanup flows. Keep non-production authentication bypasses disabled in production. Prefer role/label locators and one meaningful user flow per spec. Inspect configured traces/screenshots on failure; a passing build is not browser verification.

Setup and updates: `fm read extensions/playwright/README.md --store mp-lb/fssstack`.

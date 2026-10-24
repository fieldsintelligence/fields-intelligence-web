# Spec: CI builds on Node 24 (web #74)

## Problem
The runtime is Node 24. CI builds and deploys on Node 22.
The build must use the same major and a patched release.

## Version pins
- Node: `24.22.1` (exact). This is the Node 24 security release (nodejs.org, 2026-10-20).
- Vercel CLI: keep `vercel@62.4.0` (already pinned). No change.

## 7-day wait
The 7-day wait does not apply to Node 24.22.1. It is a security release.
Do not use `check-latest` or a floating `24` tag. Pin the exact version.
A later Node release follows the normal 7-day wait.

## Files and settings to change
1. `.github/workflows/deploy-release.yml`: setup-node step, `node-version: 22` -> `node-version: 24.22.1`.
2. `.github/workflows/pr-audit.yml`: setup-node step, `node-version: 22` -> `node-version: 24.22.1`.
3. `package.json`: add `"engines": { "node": ">=24.22.1 <25" }`.
Do not change the setup-node action SHA. Do not change any other step.

## Acceptance checks (a failing test can assert these)
- A1: every `actions/setup-node` step in `.github/workflows/*.yml` has `node-version` exactly `24.22.1`.
- A2: no workflow contains `node-version: 22`, `check-latest`, or `node-version: 24` without a patch.
- A3: `package.json` `engines.node` is exactly `>=24.22.1 <25`.
- A4: every `npm install --global vercel@` line pins `62.4.0`. No `vercel@latest`.
- A5: `npm ci` and `npm run build` pass on Node 24.22.1 in PR CI.

## Out of scope
- Runtime redeploy and the `process.version` check (#73). That is a separate later unit.
- Vercel project Node setting, dependency bumps, action version bumps.
- Workflow trigger changes.

## CI minutes
CI runs only on ready-for-review PRs and on merges.
Do not push only to start CI. Verify locally first; push once when merge-ready.

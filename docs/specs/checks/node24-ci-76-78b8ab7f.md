# Check: node24-ci, web PR #76, head 78b8ab7f

Verdict: PASS (no MUST, no SHOULD; 1 LOW)

- Spec: docs/specs/node24-ci.md at dae1ec4c8aeeff315c5ecfa15d6c9e76dadd6cdc
- Head: 78b8ab7fd1ef6e160ac1501c5c74fd4aac88b382
- Red the PR must contain: faf0aafa962b8dfe2e23447fc447159fdf17aeeb
- Base: d6a1dc77

## Items
1. Red is ancestor of head: `git merge-base --is-ancestor faf0aafa 78b8ab7f` exit 0. PASS.
2. Acceptance:
   - A1: deploy-release.yml:46 and pr-audit.yml:30 are `node-version: 24.22.1`. These are the only two setup-node steps. PASS.
   - A2: no `node-version: 22`, check-latest, node-version-file, bare 24, 24.x or lts/* in any workflow. PASS.
   - A3: package.json:5-6 engines.node `>=24.22.1 <25`; package-lock.json:25-26 root engines the same. PASS.
   - A4: deploy-release.yml:54 `npm install --global vercel@62.4.0`. No vercel@latest, no npx vercel. PASS.
   - A5: CI run 40094386272 (pr-audit, pull_request) ran on 78b8ab7f, setup-node logged `node: v24.22.1`, step "Install deps, build, and audit gate" success. PASS.
   - Other steps: workflow diff is the node-version line only. Action refs unchanged. PASS.
3. Reds (src/node24-ci.test.ts): strict equality (L165, L188, L196, L201). Rejects node-version-file (L70, L120), 24.x (L111), lts/* (L115), bare 24 (L109-110), check-latest (L71, L131), vercel@latest (L74, L144), npx vercel (L76, L150). At faf0aafa: 7 tests, 3 pass, 4 fail. PASS.
4. Lockfile: diff is +3/-0, root engines only (package-lock.json:25-27). No resolved version or integrity change. No new packages. PASS.
5. CI: see A5. PASS.
6. Scope: files changed are the two workflows, package.json (engines; test script adds src/node24-ci.test.ts), package-lock.json (root engines), src/node24-ci.test.ts. PASS.

## Local run
Node 24.22.1 (official tarball, SHA256 verified), npm 11.19.1, at 78b8ab7f:
`npm ci` exit 0; `npm run build` exit 0; `npm test` exit 0, 216/216 pass, audit 0 vulnerabilities.
Without a build, 20 built-HTML tests skip (196 pass, 20 skipped).

## Findings
- LOW-1 (reds): the vercel checks match `npm install|i|add` only. A `pnpm add -g vercel` or `yarn global add vercel` line is not detected. No such line exists. Queue for a later unit.
- Note: npm 11.19.1 does not run the unrs-resolver@1.12.2 postinstall (not in allowScripts). Install, build and tests pass. Follow-up, not in this unit.

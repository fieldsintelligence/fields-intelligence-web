# Fields Intelligence Web

Marketing site for [Fields Intelligence LLC](https://fieldsintelligence.com) — spoken brand **Fields**. Sovereign AI for organizations that handle NPI: agents that run inside your trust boundary, with inference on Fields infrastructure and no prompt or response logs.

## What this is

A production-ready Next.js (App Router) site with:

- Homepage in the brief’s order: hero, problem, use cases (banking · legal · healthcare · insurance), products (Auditlane · Lossline · Deskfield), **interactive Auditlane product demo**, How it works section (`#sovereign`), founder (Zak Fields, Cassville, MO), footer
- Contact page with a validated form (stub API at `POST /api/contact`; mailto remains available)
- Brand lockup in the header (locked brandmark + wordmark), founder mark, and favicon set derived from the locked mark
- SEO metadata, Open Graph image, JSON-LD, sitemap, and robots

The demo is labeled as a **prototype with mock data**, not a live bank integration. It walks a synthetic credit file through in-perimeter review, human sign-off, and a tamper-evident audit log on your systems.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

## Production deploys

Production ships when a semver tag matching `v*.*.*` (for example `v1.0.0`) is pushed. Publishing a GitHub Release pushes that tag, and the workflow does not listen for the release event, so the tag deploys once. `workflow_dispatch` deploys only when the ref is a `v*` tag. Pushes to `main` or any other branch, and pull request commits, do not deploy to production.

`vercel.json` sets `git.deploymentEnabled` to `false`, so Vercel’s Git integration does not build from commits. `.github/workflows/deploy-release.yml` is the only production path: it checks out the tag and runs `vercel deploy --prod --yes` with `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` set on that command and `--scope fieldsintelligence`. Pull request previews run in `.github/workflows/pr-preview.yml`.

These Actions secrets must be set on the repository before a release can ship (Full Stack sets them):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4
- No CMS. Copy lives in the React sections under `components/`

## Brand notes (from the brief)

- Spoken name is **Fields** — not Fi, FI, or Fields AI
- Locked brandmark: brain weave with central F (navy / red / brass); site chrome remains Midnight Ledger (navy + chalk)
- Do not put tax IDs on the site
- Do not lead with replacing staff; do not imply data goes to public LLM vendors

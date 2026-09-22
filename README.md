# Fields Intelligence Web

Marketing site for [Fields Intelligence LLC](https://fieldsintelligence.com) — spoken brand **Fields**. Sovereign AI for organizations that handle NPI: models and agents that stay inside your trust boundary.

## What this is

A production-ready Next.js (App Router) site with:

- Homepage in the brief’s order: hero, problem, proof (city on a hill), use cases (banking · legal · healthcare · insurance), products (Auditlane · Lossline · Deskfield), **interactive Auditlane product demo**, trust-boundary section, founder (Zak Fields, Cassville, MO), footer
- Contact page with a validated form (stub API at `POST /api/contact`; mailto remains available)
- Brand lockup in the header (locked brandmark + wordmark), founder mark, and favicon set derived from the locked mark
- SEO metadata, Open Graph image, JSON-LD, sitemap, and robots

The demo is labeled as a **prototype with mock data**, not a live bank integration. It walks a synthetic credit file through in-perimeter review, human sign-off, and an immutable log.

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

Production ships only when a versioned GitHub Release is published, or when a semver tag matching `v*.*.*` (for example `v1.0.0`) is pushed. Pushes to `main` or any other branch, and pull request commits, do not deploy.

`vercel.json` sets `git.deploymentEnabled` to `false`, so Vercel’s Git integration does not build from commits. `.github/workflows/deploy-release.yml` is the only production path: it checks out that release or tag and runs `vercel pull` (production), `vercel build --prod`, and `vercel deploy --prebuilt --prod`.

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

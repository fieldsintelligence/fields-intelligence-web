# Fields Intelligence Web

Marketing site for [Fields Intelligence LLC](https://fieldsintelligence.com) — spoken brand **Fields**. Sovereign AI for regional banks: models and agents that stay inside the bank’s trust boundary.

## What this is

A production-ready Next.js (App Router) site with:

- Homepage in the brief’s order: hero, problem, proof (city on a hill), products (Auditlane · Lossline · Deskfield), **interactive Auditlane product demo**, trust-boundary section, founder (Zak Fields, Cassville, MO), footer
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

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4
- No CMS. Copy lives in the React sections under `components/`

## Brand notes (from the brief)

- Spoken name is **Fields** — not Fi, FI, or Fields AI
- Locked brandmark: brain weave with central F (navy / red / brass); site chrome remains Midnight Ledger (navy + chalk)
- Do not put tax IDs on the site
- Do not lead with replacing staff; do not imply data goes to public LLM vendors

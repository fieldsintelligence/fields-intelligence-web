<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Deploy rules

These rules apply to humans and agents (#32).

- Production deploys only from a versioned tag (`v*.*.*`). Pushing that tag runs `.github/workflows/deploy-release.yml` once. `workflow_dispatch` runs only when the ref is a `v*` tag. Publishing a GitHub Release deploys because it pushes the tag, and there is no second production trigger.
- Previews deploy in CI. `.github/workflows/pr-preview.yml` runs on pull requests to main and writes the preview URL to the job summary.
- Never pass `--prod` or `--yes` outside `deploy-release.yml`.
- Never run `vercel link`, `vercel pull`, or `vercel env pull`.
- Every `vercel deploy` sets `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` on that command from `secrets.VERCEL_ORG_ID` and `secrets.VERCEL_PROJECT_ID`, and passes `--scope fieldsintelligence`. Do not set those IDs in a workflow `env:` block.
- If a manual preview is unavoidable, run that command from a fresh clone made for the deploy, then delete the clone.
- `.vercelignore` excludes `.env*`, `.vercel`, `node_modules`, and `.next`. Keep that file.

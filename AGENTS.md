<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Deploy rules

These rules apply to humans and agents alike (#32). Vercel project: `fields-intelligence-web-preview`.

- **Production** deploys only from a versioned GitHub release: `gh release create vX.Y.Z --target <SHA>`. The `release: published` event runs `.github/workflows/deploy-release.yml` once per tag. Nothing else deploys to production.
- **Previews** are built in CI by `.github/workflows/pr-preview.yml` on every pull request to main. The preview URL is in the run's job summary. Do not deploy previews from your own machine or box.
- Never pass `--prod` or `--yes` outside `deploy-release.yml`.
- Never run `vercel link`, `vercel pull`, or `vercel env pull`. They write `.vercel/` link state and `.env*` secrets into the working tree.
- Set the org and project IDs on the command line of each Vercel command, never with `export`, a shared shell, or a workflow `env:` block. Always pass `--scope fieldsintelligence`:

  ```sh
  VERCEL_ORG_ID=team_m5ApD0j2P01y0kiswd9aGVjD VERCEL_PROJECT_ID=prj_aunxZgkQhfy9xL4ddL8xJbeAMd6r vercel deploy --scope fieldsintelligence --token "$VERCEL_TOKEN"
  ```

- If a manual preview deploy is ever unavoidable, use that exact command from a fresh clone made for that one deploy, then delete the clone afterwards. Never deploy from an unlinked clone without the IDs: the CLI would create a stray project with a public production URL.
- `.vercelignore` excludes `.env*`, `.vercel`, `node_modules` and `.next`, so local secrets and link state are never uploaded. Keep it that way.
- The token comes from the existing `VERCEL_TOKEN` (repo secret in CI, box env for agents). Never print it and never ask Zak for one.

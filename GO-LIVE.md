# Go live — and auto-update on every push

This folder is the git repo. The website is the Next.js app in **`web/`**. Once it's
connected to Vercel, **every `git push` automatically rebuilds and redeploys the site** —
that's Vercel's built-in Git integration, no extra CI needed for deploys. (A GitHub
Action also runs the tests + a build on each push as a safety gate — see `.github/workflows/ci.yml`.)

## One-time setup (do these once)

### 1. Put it on GitHub
Create an empty repo on github.com (e.g. `assetframe`), then from this folder:
```
git remote add origin https://github.com/<you>/assetframe.git
git push -u origin main
```
(If you install the GitHub CLI, `gh repo create assetframe --private --source . --push` does it in one line.)

### 2. Connect Vercel (this is what enables auto-deploy)
1. vercel.com → **Add New → Project → Import** your GitHub repo.
2. **Root Directory → `web`** (important — the app is in a subfolder).
3. Framework preset = Next.js (auto-detected). Leave build/output as default.
4. Add the environment variables (from `web/.env.example`) under **Settings → Environment Variables**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (Clerk)
   - `ADMIN_EMAILS` (your email)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (Cloudflare R2)
   - `LEMONSQUEEZY_WEBHOOK_SECRET` (after step 3)
   - `NEXT_PUBLIC_SITE_URL` = your final domain
5. **Deploy.** You get a live URL. Add your custom domain under **Settings → Domains**.

**From now on: edit → `git push` → the site updates itself.** Preview deploys are created for branches/PRs; pushes to `main` go to production.

### 3. Lemon Squeezy webhook (needs the live URL from step 2)
In Lemon Squeezy → **Settings → Webhooks → +**:
- URL: `https://<your-domain>/api/webhooks/lemonsqueezy`
- Choose a signing secret → also paste it into Vercel as `LEMONSQUEEZY_WEBHOOK_SECRET`
- Subscribe to the `subscription_*` events. Redeploy so the env var takes effect.

### 4. Cloudflare R2 + Clerk
Follow `web/SETUP.md` for the click-by-click on each (R2 bucket + token + `publish.py`; Clerk keys + paths).

## Publishing a new edition (your routine)
```
/mvp ETH   /mvp SOL   ...              # generate reports (Python pipeline)
python scripts/export_content.py        # refresh catalog + track record + free assets into web/
python scripts/publish.py               # push new Pro files to R2
git add -A && git commit -m "edition: <date>" && git push   # ← site auto-updates
```

## Scaling — what's already handled vs the next upgrade
- **More users** scales automatically: Clerk (auth), Vercel (edge/serverless), and R2/CDN
  (zero-egress downloads) all autoscale. 1,000 or 50,000 readers need no change.
- **More reports** (hundreds+) is the one thing to upgrade later: move the catalog from the
  committed JSON to **Supabase Postgres** (indexed full-text search) and store all report files
  in R2. The reports browser already sits behind a clean data layer (`lib/search.ts`), so that
  swap doesn't touch the UI. Do it when the catalog outgrows a few dozen reports.

## Safety
- Real secrets live only in Vercel env vars and your local `web/.env.local` (git-ignored). Never committed.
- `npm test` (in `web/`) covers the security-critical logic: webhook signature verification,
  the subscription lifecycle, and the Pro-download path-traversal guard.

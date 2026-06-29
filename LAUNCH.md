# AssetFrame — Launch runbook

The single, ordered checklist to take AssetFrame live. Everything below the engine/web code is
**built and green locally but NOT pushed or deployed** as of 2026-06-29 — this is the gate that
turns that into a live launch. Work top to bottom; don't skip the ordering notes.

> Status legend: ☐ to do · ⚙️ owner-only (dashboard/secret) · 🔒 gated on an earlier step.

---

## 0. Where things stand (read first)

- **Web** (`assetframe-infra/web`, Next 16 on Vercel): launch phases F1–F8 done on `main`, suite
  green (tsc + ESLint 0/0 + vitest + `next build`). **Not pushed.**
- **Engine** (`assetframe-scripts`, Python on the OCI box): the refactor + hardening stack + the
  scored-row taxonomy fix are committed on `main` (1693 tests). **Not pushed, not on the box.**
- **Neon**: migrations are already applied to BOTH branches (prod `main` + dev `development` at
  `30000`). Nothing to do here for the schema — it's ahead of the deployed code, which is fine
  (the new columns are additive).
- **Deferred, do NOT block launch on these:** the F7 control-server cutover (§6), the Tier-2
  schema flush (§6), the F8 subjective visual polish (§6), CSP nonce (staging).

---

## 1. Owner config — do these in the dashboards BEFORE deploying ⚙️

These can't be done from code. Nothing works end-to-end until they're set.

### Clerk (clerk.com)
- ☐ Billing enabled; plan **slug must be exactly `pro`**, price **$19.99 USD/mo**, **7-day** trial.
- ☐ Webhook → `https://www.assetframe.co.uk/api/webhooks/clerk`, events: `user.deleted` +
  `subscription.*` / `subscriptionItem.*`. Copy the signing secret → `CLERK_WEBHOOK_SECRET`.

### Vercel env (Production scope unless noted) ⚙️
- ☐ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- ☐ `DATABASE_URL` (Neon prod `main`), `DATABASE_URL_DEV` (Neon `development`, Preview scope)
- ☐ `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET=assetframe-pro`
- ☐ `ADMIN_EMAILS` (your email — a typo here = admin lockout or over-grant)
- ☐ `UPSTASH_REDIS_REST_URL` / `_TOKEN` (rate limiting **fails OPEN** without it)
- ☐ `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  (push no-ops without them)
- ☐ `RESEND_API_KEY` + verified `RESEND_FROM` (alert/digest emails no-op without them)
- ☐ `CRON_SECRET` (the cron routes fail **closed** without it)
- ☐ `COINGECKO_API_KEY` (optional — crypto data fallback)
- ☐ `GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACE_ID` (optional — the /reviews page)

### Vercel cron (vercel.json)
- ☐ Confirm the schedule for `/api/cron/new-editions` (notifications) and
  `/api/cron/engine-health` (offline/failed-run alerts). Run new-editions **more than once/day**
  so a late un-hide is picked up promptly (it's bounded + idempotent, so extra runs are safe).

---

## 2. Deploy the WEB app ⚙️

1. ☐ `cd code/assetframe-infra && git push origin main` → Vercel auto-builds + deploys.
2. ☐ Watch the Vercel build; on deploy it runs `npm run migrate up` — a no-op now (Neon already
   at `30000`), but confirm it reports "no migrations to run".
3. ☐ Smoke the public site: `/`, `/reports`, `/track-record`, `/pricing`, `/faq`, `/about`, a
   report detail page, `/api/health` (should be 200 `{ok:true}`).
4. ☐ Sign in; confirm Pro checkout opens (Clerk Billing drawer) at $19.99/7-day; confirm
   `/admin` loads for an `ADMIN_EMAILS` account and is `noindex`.

---

## 3. Deploy the ENGINE (the OCI box) ⚙️

Run as the operator (SSH). The box is Oracle Linux aarch64; engine runs as root via systemd.

1. ☐ **Back up first** — `git -C /opt/assetframe-scripts stash` any uncommitted ledger rows
   (`reset --hard` discards them).
2. ☐ `cd code/assetframe-scripts && git push origin main`, then on the box:
   `git fetch && git reset --hard origin/main && git clean -fd`.
3. ☐ `pip install -r requirements.txt` (picks up PyJWT for the control server).
4. ☐ **Copy the systemd units** (Phase 5 changed `ExecStart` module paths — the CI restart does
   NOT cp units, so this is mandatory on the first post-refactor deploy):
   `sudo cp deploy/assetframe-{daily,poller}.service /etc/systemd/system/` and the control units
   `sudo cp deploy/assetframe-control{,-dev}.service /etc/systemd/system/`, then
   `sudo systemctl daemon-reload`.
5. ☐ Engine `.env` (gitignored, secrets-only — env wins over `engine.json`): confirm secrets;
   set `ASSETFRAME_RUN_TIMEOUT=7200` (NOT 9000); set the control-server vars
   (`ASSETFRAME_CONTROL_PORT`, `ASSETFRAME_CF_TEAM`, `ASSETFRAME_CONTROL_AUD`,
   `ASSETFRAME_CONTROL_TOKEN`) per [the control-plane notes](../). Do NOT put `ASSETFRAME_*`
   runtime knobs in `.env` unless you intend them to override `engine.json`.
6. ☐ `sudo systemctl restart assetframe-poller.service` (and enable the control units when ready
   for §6). The poller forces a Neon sync + reap on (re)start.
7. ☐ **The re-sync now backfills the scored-row taxonomy** (the F1 fix) → the /track-record
   by-class / by-type / by-regime breakdowns populate. Verify on the live site.

---

## 4. Post-deploy verification (sign-off)

- ☐ A real generation → publish chain lands an edition on the site (admin → generate, or wait
  for the 05:00 run); the report renders, the free/Pro gate works.
- ☐ `/track-record` shows the breakdowns filled (not empty) after the engine re-sync.
- ☐ `/status` shows the engine **operational** + the latest publish.
- ☐ A test subscription: trial starts, `/account/subscription` shows "first charge on X",
  cancel works.
- ☐ Push: follow an instrument, confirm a new-edition push arrives (on a supported browser).
- ☐ `engine-health` cron emails on a simulated offline (or just confirm `adminEmailSet:true`).
- ☐ Point an external uptime monitor (UptimeRobot / BetterStack) at `/api/health`.

---

## 5. Reconciliation (run after the first real publish)

Run `web/db/reconcile.sql` against prod (Neon SQL editor) — every integrity metric should be 0.
Keep Neon ↔ R2 ↔ box-ledger in lockstep: any full clear must pair the box (`clear_reports` +
`reset_ledger` + `clear_r2`) with the Neon catalog clear (admin → Danger zone → Full reset, which
now requires type-to-confirm).

---

## 6. Gated follow-ups (AFTER the box is live — do NOT block launch)

- 🔒 **F7 control-server cutover.** The control server (`control_server.py`) deploys additively in
  §3 (changes nothing until wired). Once it's up + reachable at `engine[-dev].assetframe.co.uk`,
  wire the admin dashboard to `POST /control` + SSE `/events` with the CF-Access service token,
  then retire the 30s Neon poll + the Upstash wake/heartbeat (Upstash → rate-limiting only). Do
  this with the live server so the SSE/Access flow is e2e-tested. Contract + IDs are in the
  control-plane memory.
- 🔒 **Tier-2 schema flush.** Optional cleanliness: collapse the 30 migrations → one baseline +
  drop the genuinely-dead editions columns (`direction_view`, `social_context`, `report_ref`).
  Destructive across Neon + box + R2 — coordinate all three; KEEP `confidence_band` (it's a live
  notification hook). Not launch-blocking (dead cols are harmless NULLs).
- ☐ **F8 visual polish (design pass with you):** landing candle animation richness, reviews
  carousel + B2B section, how-it-works scroll-reveal timeline, sign-in animations; minor a11y/SEO
  nits (twitter-image, legal-page heading order, table `scope`/labels, FAQ "what's coming").
- ☐ **Observability:** wire Sentry (or similar) for runtime error capture; run Lighthouse / Core
  Web Vitals on the deployed site and address regressions.
- ☐ **CSP nonce** (staging task): move script-src off `'unsafe-inline'` with a per-request nonce,
  report-only on staging first (the XSS path is already closed at source via lib/jsonld.ts).
- ☐ **Security debt:** rotate the two Cloudflare Access service-token secrets that were pasted in
  chat (regenerates `client_secret` only; update `CF_ACCESS_CLIENT_SECRET` in Vercel).

---

## 7. High-value adds backlog (post-launch, P2 — pick by impact)

Shipped in F9: `/status` (public health/transparency) + `/api/health` (uptime). Candidates next:
- **Sample Pro report** — one full Pro edition viewable without paying (conversion).
- **Changelog / "what's new"** page — momentum + SEO (seed once there's user-facing history).
- **Onboarding** — guide a new account to its first report + following an instrument.
- **Compare** — multi-instrument side-by-side from the watchlist.
- **Track-record CSV export** — for the data-minded / B2B.

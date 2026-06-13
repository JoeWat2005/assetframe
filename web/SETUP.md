# AssetFrame web app — setup & launch

A Next.js 16 app: storefront, reports library, sign-in-gated **Track record**, gated **Pro**
downloads, **admin** dashboard, Terms/Privacy, footer with socials. Auth = Clerk, payments =
Lemon Squeezy (merchant of record — handles your VAT), private Pro files = Cloudflare R2,
hosting = Vercel. The Python pipeline stays the content source; `export_content.py` feeds this app.

## 0. Run it locally (5 min)
```
cd web
cp .env.example .env.local      # then paste your keys (Clerk is enough to see auth working)
npm install
npm run dev                     # http://localhost:3000
```
Public pages work with no keys. Sign-in, Track record, Pro and Admin need the keys below.

## 1. Clerk (auth) — free
1. clerk.com → create an application. Copy **Publishable key** and **Secret key** into `.env.local`
   (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
2. In Clerk → Paths, set sign-in/up to `/sign-in` and `/sign-up`.
3. Put your own email in `ADMIN_EMAILS` to unlock `/admin`. (Later, set a user's
   `publicMetadata.role = "admin"` in Clerk for a permanent admin.)

## 2. Lemon Squeezy (payments) — merchant of record
1. Create a store → **Product → Subscription**, set the price.
2. Copy the product **buy link** into `NEXT_PUBLIC_CHECKOUT_URL` and set `NEXT_PUBLIC_PRO_PRICE`.
3. **Settings → Webhooks → add endpoint** `https://YOURDOMAIN/api/webhooks/lemonsqueezy`,
   subscribe to the `subscription_*` events, and copy the **signing secret** into
   `LEMONSQUEEZY_WEBHOOK_SECRET`. The webhook verifies the signature and flips the buyer's
   Clerk account to Pro automatically (matched by email).

## 3. Cloudflare R2 (private Pro files)
1. Cloudflare → R2 → create a **private** bucket, e.g. `assetframe-pro`.
2. R2 → Manage API tokens → create one. Put the values in `.env.local`:
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. Upload Pro files from the repo root: `pip install boto3 && python scripts/publish.py`
   (keys land as `<date>/<slug>/pro.html|pdf` — exactly what the app requests).
   The app serves them only to subscribers, via 120-second signed URLs.

## 4. Deploy to Vercel — free Hobby tier
1. Push this repo to GitHub. In Vercel → **New Project → import the repo**.
2. Set **Root Directory = `web`** (important — the app lives in a subfolder).
3. Add every variable from `.env.example` in Vercel → Settings → Environment Variables
   (use your live keys; set `NEXT_PUBLIC_SITE_URL` to your real domain).
4. Deploy. Add your custom domain in Vercel → Domains.

## 5. Publish a new edition (the routine)
From the repo root:
```
/mvp ETH   /mvp SOL   ...        # generate reports (Python pipeline; scores yesterday first)
python scripts/export_content.py # refresh catalog + track record + public free assets
python scripts/publish.py        # push new Pro files to R2
git add -A && git commit -m "edition" && git push   # Vercel auto-redeploys
```

## What's gated, and how
- **Free Snapshots** — public static files under `/r/...`.
- **Track record** — any **signed-in** member (sign-in wall + lead capture).
- **Pro reports** — **subscribers** only; server checks Clerk metadata, then issues a short-lived
  signed R2 URL. Bucket credentials never reach the browser. The route validates the path so no one
  can request anything but `…/pro.html|pdf`.
- **Admin** — `publicMetadata.role === "admin"` or an email in `ADMIN_EMAILS`.

## Security notes (already done)
- Security headers (HSTS, nosniff, frame SAMEORIGIN, referrer, permissions-policy) in `next.config.ts`.
- Webhook **HMAC signature verified** (timing-safe) before any access is granted.
- Secrets are server-only env vars; only `NEXT_PUBLIC_*` reach the client.
- Signed R2 URLs expire in 120s; Pro files are never in the public bundle.

## Hardening to add when you have your domains
- **Content-Security-Policy**: add a CSP header allowing your domain + Clerk
  (`https://*.clerk.accounts.dev`, your Clerk frontend API) + Lemon Squeezy. Left out by default
  so an over-tight policy can't silently break Clerk — add it deliberately and test sign-in.
- **Rate limiting** on `/api/*` (e.g. Vercel Firewall or Upstash Ratelimit) to blunt abuse.
- Turn on Clerk **bot protection** and, if you want, email verification before granting member access.

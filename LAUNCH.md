# AssetFrame — launch runbook

Two parts. **Part 1 gets a real website live today, free, in ~15 minutes** and needs no
payment setup. **Part 2 switches on paid Pro** when you're ready (also possible today).
Everything is already built — these are click-through steps, not coding.

Build the site whenever you change reports or config:
```
python scripts/build_site.py
```
This produces the `site/` folder. **That folder *is* the website** — you deploy it as-is.

---

## Part 1 — Go live (free), today

1. **Make a Cloudflare account** (free) at dash.cloudflare.com.
2. In the dashboard: **Workers & Pages → Create → Pages → Upload assets**.
3. Name it `assetframe`. **Drag the whole `site` folder** (from `Desktop\advisor\mvp\site`) onto the upload area → **Deploy**.
4. You now have a live URL like `https://assetframe.pages.dev`. **That's your website — share it.**
   - Free Snapshots and the Track-record page work immediately.
   - The gating Function and Members page deploy too, but Pro stays locked until Part 2.
5. Put that URL into `site.config.json` (`site_url`) so future builds know it.

**Custom domain (optional, ~10 min):** buy `assetframe.co.uk` (Cloudflare Registrar is cheapest),
then in the Pages project → **Custom domains → Set up a domain**. Cloudflare wires the DNS for you.

> To redeploy after any change: rebuild (`python scripts/build_site.py`) and either drag the
> `site` folder again, or connect a GitHub repo for auto-deploy (see Part 4).

---

## Part 2 — Switch on paid Pro

Three things: a checkout, private storage for Pro files, and a binding that connects them.

### 2a. Create the subscription (Lemon Squeezy — handles your VAT)
1. Sign up at lemonsqueezy.com, create your **Store**.
2. **Products → New Product → Subscription.** Set the price (e.g. £12/month).
3. In the product, **enable "Generate license keys"** (this is what unlocks downloads).
4. Publish, then copy the product's **buy link** (Share → looks like `https://YOURSTORE.lemonsqueezy.com/buy/abc-123`).
5. Paste it into `site.config.json` → `checkout_url`, and set `pro_price_label` (e.g. `"£12/month"`).
6. Rebuild: `python scripts/build_site.py` — the Subscribe button is now live.

### 2b. Private storage for Pro files (Cloudflare R2)
1. Cloudflare dashboard → **R2 → Create bucket**, name it `assetframe-pro` (keep it **private**).
2. Upload the Pro files. Easiest today: in the bucket, create the path and drag the files so the keys are:
   ```
   2026-06-13/ETH/pro.html
   2026-06-13/ETH/pro.pdf
   2026-06-13/AAPL/pro.html   ... etc (one folder per edition)
   ```
   (These live in `reports/<date>/<INSTR>/pro.*` on your machine.)
   - **Automate it instead:** `pip install boto3`, set the four `R2_*` env vars (R2 → Manage API tokens → create one; you'll get Account ID, Access Key, Secret), then `python scripts/publish.py`. Run `--dry-run` first.

### 2c. Connect storage to the site
1. Pages project → **Settings → Functions → R2 bucket bindings → Add binding.**
2. Variable name **`PRO_BUCKET`** (exact), bucket `assetframe-pro`. Save.
3. **Redeploy** (drag the `site` folder again) so the binding takes effect.

That's it. No API secrets are needed — Lemon Squeezy's licence check is public.

---

## Part 3 — Before you charge real money (do not skip)

- **Disclaimer review.** Every report and page already carries the "general research, not advice"
  disclaimer. Get it **reviewed once** by a solicitor familiar with FCA financial promotions
  (~£500–1,500) before taking your first payment. The free site can be live during this.
- **Compliant data.** Today's reports were generated on Yahoo (developer tier). Before charging:
  regenerate crypto (ETH/SOL/BTC) on **exchange-direct APIs** (free, compliant) and add a
  **licensed feed for equities** (AAPL etc.). The engine already has the provider switch
  (`ADVISOR_DATA_PROVIDER` / `EODHD_API_KEY` in `scripts/intraday.py`).
- Register as a **sole trader** (free) for income.

---

## Part 4 — Test the paid flow (Lemon Squeezy test mode)

1. In Lemon Squeezy turn on **Test mode**; do a test checkout → you receive a **licence key** by email.
2. On your live site, open **Members**, paste the key, click **Unlock**, then open a Pro report — it should load.
3. Open a Pro link in a private window with no key → you're sent to **Pricing**. That's the gate working.

**Optional — auto-deploy instead of drag-drop:** push this `mvp/` folder to a GitHub repo, then in
Pages choose **Connect to Git** with build command `python scripts/build_site.py` and output dir `site`.
Every `git push` then rebuilds and redeploys.

---

## Publishing a new edition (the daily routine)
1. Generate reports: `/mvp ETH`, `/mvp SOL`, … (scores yesterday's calls first, automatically).
2. `python scripts/build_site.py` — refreshes the catalog + track record.
3. `python scripts/publish.py` — pushes the new Pro files to R2 (or drag them in).
4. Redeploy the `site` folder (or `git push` if you connected Git).

The Track-record page updates itself from the ledger as calls are scored — that growing,
append-only record is your strongest sales asset.

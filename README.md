# AssetFrame

*Next-session market intelligence, scored after the fact.*

AssetFrame generates a two-tier research report pair for any tradable instrument — futures, FX, crypto, and US single stocks:

- **AssetFrame Snapshot** (free, 1 page) — status & risk badges, last price, expected range, one simple chart, three thesis bullets, Bull/Base/Bear matrix, timeline strip.
- **AssetFrame Pro** (paid, 3–6 pages) — verdict box, price ladder, long/short research views, scenario matrix, event-risk timeline, conditional setups with R:R, data-gated options context, asset-class statistics, trade-quality scorecard, outcome ledger, and a full source audit.

Every Pro report registers falsifiable predictions for the next session. The next run scores them into an append-only ledger **before doing anything else** — the "scored after the fact" promise is mechanical, not editorial.

## How a run works

1. **Score expired predictions** — any `data/predictions/*_predictions.json` whose window has closed is scored into `ledger/outcome_ledger.csv` (append-only; manual/news predictions resolved first; calibration block appears at ≥10 rows).
2. **Engine** — `scripts/intraday.py` pulls warm-up-extended OHLC and computes indicators (SMA/EMA/RSI/MACD/ATR), swings, VWAP, floor pivots, ATR bands, and empirical level statistics, with explicit `freshness` / `degraded` / `provider` blocks.
3. **Context** — news and catalysts, economic calendar, positioning, and options context where genuinely sourceable.
4. **Session rules** — `scripts/sessions.py` applies the instrument's profile (`cme_futures`, `fx_spot`, `crypto_24_7`, `us_equity_rth`) and computes the prediction window for the next full session.
5. **Canonical payload** — every price that appears anywhere lives exactly once in `canonical.levels`; charts, ladder, tables, and ledger all reference those ids.
6. **Generate** — `scripts/mvp_report.py` renders both PDFs, both HTML twins, `metadata.json`, and a `preview.png`, then runs the QA gate. **The build aborts on any violation.**
7. **Register + inspect** — the Pro's predictions are written for the next session's window, and the PDFs are visually inspected page by page before being stamped (`--stamp-visual`).

## What the QA gate enforces

- **Price integrity** — CSV last price == canonical object == report header; levels ↔ setups ↔ ladder ↔ ledger identity.
- **Language** — research framing only ("Conditional setup", "Invalidation"); imperative trade instructions and promotional language hard-fail the build.
- **Claim gating** — high-impact claims (geopolitics, inventories, earnings dates, positioning…) must be labelled confirmed / multiple-source / single-source / unverified; unverified claims cannot drive the thesis.
- **Free/Pro split** — entries, invalidation logic, R:R, the ladder, scorecard, and ledger are excluded from the free tier by scan, not by convention.
- **Data honesty** — timestamps UTC-normalized, no lookahead, partial (cold) indicators hidden or labelled, options context omitted with an explicit line when data is unavailable.

## Install

Python 3.10+.

```
pip install -r requirements.txt
```

Market data comes from Yahoo Finance public endpoints by default (no API key). Set `ADVISOR_DATA_PROVIDER=eodhd` + `EODHD_API_KEY` to switch to EODHD (futures always stay on Yahoo).

## Usage

Designed to run inside [Claude Code](https://claude.com/claude-code): open this folder as the project root and run

```
/mvp WTI
/mvp BTC
/mvp AAPL
```

The deterministic parts also run standalone:

```
python scripts/intraday.py GC=F --name XAUUSD --hrange 10d --roll-utc 22
python scripts/sessions.py cme_futures
python scripts/mvp_report.py data/payloads/XAUUSD_af_payload.json
python scripts/score_report.py data/predictions/XAUUSD_af_predictions.json --dry-run
```

## Repository layout

```
.claude/skills/mvp/SKILL.md     the pipeline spec (13-step flow, QA rules, stats menus)
.claude/commands/mvp.md         /mvp slash command
scripts/intraday.py             data engine (OHLC, indicators, pivots, level stats)
scripts/sessions.py             session profiles + prediction-window policy
scripts/mvp_report.py           Snapshot/Pro generator + QA gate
scripts/report_pdf.py           shared PDF/chart renderer (fpdf2)
scripts/score_report.py         append-only outcome ledger scorer
scripts/build_site.py           static website generator (storefront + track record + gating)
scripts/publish.py              uploads locked Pro files to private Cloudflare R2
web/functions/pro/              Cloudflare Pages Function: licence-gated Pro downloads
site.config.json                site URL + Lemon Squeezy checkout link (no secrets)
LAUNCH.md                       step-by-step runbook to put the site live
logo/                           AssetFrame brand assets
data/candles/                   hourly + daily OHLC CSVs (regenerated per run)
data/analysis/                  engine analysis JSON (indicators, pivots, freshness)
data/payloads/                  canonical report payloads (one per report)
data/predictions/               registered predictions awaiting scoring
ledger/outcome_ledger.csv       the scored track record (append-only)
reports/YYYY-MM-DD/<INSTR>/     generated report pairs
```

## Disclaimer

AssetFrame is general market research and decision support. It is not investment advice, not a personal recommendation, and executes no trades. No outcome is guaranteed. Do your own research; capital is at risk.

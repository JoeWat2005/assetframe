"""Intraday data fetch + analysis for the advisor — stdlib only.

Usage:
  python scripts/intraday.py SYMBOL [--name NAME] [--datadir data]
         [--hrange 10d] [--drange 1y] [--roll-utc 22] [--related "SYM1,SYM2,SYM3"]
         [--provider yahoo|eodhd]

NAME defaults to the symbol stripped of '=' and '^' (GC=F -> GCF). Pass --name
explicitly for the canonical instrument prefixes (XAUUSD, GBPJPY, BTC, ES, ...).

Symbols are always given in YAHOO format: BP.L, TSCO.L, ^FTSE, GBPUSD=X, BZ=F, GC=F,
BTC-USD, AAPL ... The provider layer maps them per provider.

Data providers:
  yahoo (default)  Yahoo chart API, no key. Unofficial: fine for personal/dev use,
                   NOT licensed for a commercial product.
  eodhd            Set ADVISOR_DATA_PROVIDER=eodhd + EODHD_API_KEY=... (or pass
                   --provider eodhd). Licensed feed; LSE 15-min delayed. Futures (=F)
                   are not covered by EODHD and always come from Yahoo; any failed
                   EODHD fetch also falls back to Yahoo per-fetch — see the JSON's
                   "provider" block for what actually served each series.

Writes:
  <datadir>/candles/<NAME>_hourly.csv      datetime_utc,open,high,low,close,volume
  <datadir>/candles/<NAME>_daily.csv       date,open,high,low,close,volume
  <datadir>/analysis/<NAME>_analysis.json  indicators, pivots, ATR day-range bands,
                          trend reads, freshness (staleness + market state),
                          degraded flag, provider, files (the csv paths above).

Indicator warm-up: the CSVs contain the requested display window PLUS extra lookback
history (hourly: +21 calendar days; daily: one standard range up, e.g. 1y -> 2y) so
chart SMAs/RSI are fully warmed BEFORE the display window starts; report_pdf.py
computes indicators on the full series and crops each chart back to its
"display_days". The JSON's "windows" block records display vs fetched ranges and
per-SMA warm-up sufficiency at the display-window start. score_report.py is
unaffected (it filters bars to the prediction window).

Degraded mode: with fewer than 24 hourly bars but usable daily data, the run still
succeeds with "degraded": "daily_only" — hourly block null, prior/today sessions and
pivots rebuilt from the last two DAILY bars (tagged "basis": "daily_bars_fallback"),
ATR bands anchored on the last daily close (tagged "anchor": "prior_close_fallback").
If daily fails too: clear error on stderr, exit 2.

Methodology (industry standard):
  - Daily = regime/context: ATR(14) Wilder, SMA20/50/100/200, realized vol, swing levels.
  - Hourly = today's trend: SMA20/50, EMA9/21, RSI(14), MACD(12,26,9), swing structure,
    session VWAP when volume exists.
  - Day-range projection: classic floor pivots from PRIOR session OHLC (PP, R1-R3, S1-S3)
    plus ATR bands anchored on TODAY'S session open (open +/- 0.5*ATRd inner, +/- 1.0*ATRd outer).
"""
import concurrent.futures
import csv, json, math, os, sys, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
PROVIDER_DEFAULT = os.environ.get("ADVISOR_DATA_PROVIDER", "yahoo")


def _http_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def yahoo_chart(symbol, interval, rng):
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}"
           f"?interval={interval}&range={rng}")
    data = _http_json(url)
    res = data["chart"]["result"][0]
    q = res["indicators"]["quote"][0]
    rows = []
    for i, ts in enumerate(res.get("timestamp", [])):
        o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        if None in (o, h, l, c):
            continue
        v = q.get("volume", [None] * (i + 1))[i] or 0
        rows.append({"ts": ts, "o": o, "h": h, "l": l, "c": c, "v": v})
    return res["meta"], rows


# --- EODHD adapter (symbols: {CODE}.{EXCHANGE}; only .L->.LSE verified from docs,
# the rest follow the documented pattern — verify with a live key before relying on them)
EODHD_EXCH_MAP = {".L": ".LSE", ".PA": ".PA", ".AS": ".AS", ".DE": ".XETRA", ".MI": ".MI",
                  ".MC": ".MC", ".TO": ".TO", ".HK": ".HK", ".T": ".TSE", ".SW": ".SW"}
CRYPTO_QUOTES = {"USD", "GBP", "EUR", "JPY", "USDT", "BTC", "ETH"}


def map_symbol_eodhd(sym):
    """Yahoo symbol -> (eodhd symbol | None, asset_class). None => not covered."""
    if sym.endswith("=F"):
        return None, "futures"
    if sym.endswith("=X"):
        base = sym[:-2]
        if len(base) == 3:  # Yahoo's 'JPY=X' means USD/JPY
            base = "USD" + base
        return base + ".FOREX", "forex"
    if sym.startswith("^"):
        return sym[1:] + ".INDX", "index"
    if "-" in sym and "." not in sym:
        base, _, quote = sym.rpartition("-")
        if base and quote in CRYPTO_QUOTES:  # BTC-USD yes; BRK-B falls through
            return sym + ".CC", "crypto"
    for suf, repl in EODHD_EXCH_MAP.items():
        if sym.endswith(suf):
            return sym[: -len(suf)] + repl, "equity"
    if "." not in sym:
        return sym + ".US", "equity"
    return sym, "equity"  # unknown suffix: pass through, fallback rescues if wrong


def range_to_timedelta(rng):
    rng = rng.strip().lower()
    if rng == "max":
        return timedelta(days=7300)
    if rng.endswith("mo"):
        return timedelta(days=int(rng[:-2]) * 31)
    n, unit = int(rng[:-1]), rng[-1]
    return timedelta(days=n * {"d": 1, "w": 7, "y": 366}[unit])


def eodhd_chart(symbol, interval, rng, api_key):
    esym, klass = map_symbol_eodhd(symbol)
    if esym is None:
        raise ValueError(f"eodhd does not cover {klass}")
    now = datetime.now(timezone.utc)
    start = now - range_to_timedelta(rng)
    rows = []
    if interval == "1d":
        url = (f"https://eodhd.com/api/eod/{urllib.parse.quote(esym)}"
               f"?api_token={api_key}&fmt=json&period=d&order=a"
               f"&from={start:%Y-%m-%d}&to={now:%Y-%m-%d}")
        raw = _http_json(url)
        if not isinstance(raw, list):
            raise ValueError(f"unexpected eodhd response: {str(raw)[:80]}")
        for r in raw:
            o, h, l, c = r.get("open"), r.get("high"), r.get("low"), r.get("close")
            if None in (o, h, l, c):
                continue
            ts = int(datetime.strptime(r["date"], "%Y-%m-%d")
                     .replace(tzinfo=timezone.utc).timestamp())
            # 'close' not 'adjusted_close': matches Yahoo's unadjusted chart closes,
            # keeping SMA/ATR behavior identical across providers
            rows.append({"ts": ts, "o": o, "h": h, "l": l, "c": c, "v": r.get("volume") or 0})
    else:
        ivmap = {"60m": "1h", "1h": "1h", "5m": "5m", "1m": "1m"}
        url = (f"https://eodhd.com/api/intraday/{urllib.parse.quote(esym)}"
               f"?api_token={api_key}&fmt=json&interval={ivmap.get(interval, '1h')}"
               f"&from={int(start.timestamp())}&to={int(now.timestamp())}")
        raw = _http_json(url)
        if not isinstance(raw, list):
            raise ValueError(f"unexpected eodhd response: {str(raw)[:80]}")
        for r in raw:
            o, h, l, c = r.get("open"), r.get("high"), r.get("low"), r.get("close")
            if None in (o, h, l, c):
                continue
            ts = r.get("timestamp")  # docs name the field ambiguously; accept both
            if ts is None and r.get("datetime"):
                ts = datetime.strptime(r["datetime"][:16], "%Y-%m-%d %H:%M") \
                    .replace(tzinfo=timezone.utc).timestamp()
            if ts is None:
                continue
            rows.append({"ts": int(float(ts)), "o": o, "h": h, "l": l, "c": c,
                         "v": r.get("volume") or 0})
    meta = {"exchangeTimezoneName": None,
            "regularMarketPrice": rows[-1]["c"] if rows else None,
            "instrumentType": {"forex": "CURRENCY", "crypto": "CRYPTOCURRENCY",
                               "index": "INDEX"}.get(klass, "EQUITY"),
            "currentTradingPeriod": None}
    return meta, rows


def fetch_chart(symbol, interval, rng, provider=None, api_key=None):
    """Provider-agnostic OHLCV fetch -> (meta, rows ascending UTC).
    meta keys: exchangeTimezoneName, regularMarketPrice, instrumentType,
    currentTradingPeriod (None if the provider lacks it), provider, provider_note."""
    provider = provider or PROVIDER_DEFAULT
    api_key = api_key or os.environ.get("EODHD_API_KEY")
    note = None
    if provider == "eodhd":
        esym, klass = map_symbol_eodhd(symbol)
        if esym is None:
            note = f"{klass} not covered by eodhd; served by yahoo"
        elif not api_key:
            note = "EODHD_API_KEY not set; served by yahoo"
        else:
            try:
                meta, rows = eodhd_chart(symbol, interval, rng, api_key)
                if rows:
                    meta["provider"], meta["provider_note"] = "eodhd", None
                    return meta, rows
                note = "eodhd returned 0 rows; served by yahoo"
            except Exception as ex:
                note = f"eodhd failed ({str(ex)[:60]}); served by yahoo"
    meta, rows = yahoo_chart(symbol, interval, rng)
    meta = dict(meta)
    meta["provider"], meta["provider_note"] = "yahoo", note
    return meta, rows


def freshness_block(meta, rows, now=None, granularity="hourly"):
    """Staleness + market-state read on the freshest bar of `rows`.
    Only unambiguous problems set stale=true; marginal calls are left to the skill
    via market_state + age_minutes:
      crypto (24/7): stale > 3h.
      FX/futures (24/5): weekend = Fri 22:00 -> Sun 22:00 UTC (lenient across DST,
        never false-stale); inside it, stale only if the last bar predates the
        Friday 22:00 close by > 3h.
      equities/ETFs/indices: Yahoo's currentTradingPeriod (exchange-aware, included
        in the chart response) -> in-session: stale > 90 min; out of session:
        stale > 96h (dead feed / delisting) so weekends and bank-holiday Mondays
        never false-flag. Missing meta (e.g. eodhd): unknown + the 96h rule.
    granularity="daily": daily bars are stamped at session OPEN, so intra-session
    age measures time-since-open, not feed lag — staleness becomes the 96h
    dead-feed rule only; market_state stays informative.
    """
    meta = meta or {}
    now = now or datetime.now(timezone.utc)
    last = datetime.fromtimestamp(rows[-1]["ts"], tz=timezone.utc)
    age_min = int((now - last).total_seconds() // 60)
    itype = (meta.get("instrumentType") or "UNKNOWN").upper()
    state, stale = "unknown", age_min > 96 * 60
    if itype == "CRYPTOCURRENCY":
        state, stale = "open", age_min > 180
    elif itype in ("CURRENCY", "FUTURE", "FUTURES"):
        wd = now.weekday()  # Mon=0 .. Sun=6
        if (wd == 4 and now.hour >= 22) or wd == 5 or (wd == 6 and now.hour < 22):
            state = "closed_weekend"
            fri_close = (now - timedelta(days=(wd - 4) % 7)).replace(
                hour=22, minute=0, second=0, microsecond=0)
            stale = last < fri_close - timedelta(minutes=180)
        else:
            state, stale = "open", age_min > 180
    elif itype in ("EQUITY", "ETF", "INDEX", "MUTUALFUND"):
        reg = (meta.get("currentTradingPeriod") or {}).get("regular") or {}
        start, end = reg.get("start"), reg.get("end")
        if start and end:
            if start <= now.timestamp() <= end + 1800:
                state, stale = "open", age_min > 90
            else:
                state, stale = "closed_offhours", age_min > 96 * 60
    if granularity == "daily":
        stale = age_min > 96 * 60
    return {"last_bar_utc": last.strftime("%Y-%m-%d %H:%M"), "age_minutes": age_min,
            "instrument_type": itype, "market_state": state, "stale": bool(stale),
            "stale_reason": (f"last bar {age_min} min old with market_state={state}"
                             if stale else None), "bar_granularity": granularity}


def sma(vals, n):
    return sum(vals[-n:]) / n if len(vals) >= n else None


def ema_series(vals, n):
    if len(vals) < n:
        return []
    k = 2 / (n + 1)
    out = [sum(vals[:n]) / n]
    for v in vals[n:]:
        out.append(out[-1] + k * (v - out[-1]))
    return out


def rsi14(closes):
    n = 14
    if len(closes) <= n:
        return None
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    ag = sum(max(d, 0) for d in deltas[:n]) / n
    al = sum(max(-d, 0) for d in deltas[:n]) / n
    for d in deltas[n:]:
        ag = (ag * 13 + max(d, 0)) / 14
        al = (al * 13 + max(-d, 0)) / 14
    return 100.0 if al == 0 else round(100 - 100 / (1 + ag / al), 1)


def atr14(rows):
    if len(rows) < 15:
        return None
    trs = []
    for i in range(1, len(rows)):
        h, l, pc = rows[i]["h"], rows[i]["l"], rows[i - 1]["c"]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    a = sum(trs[:14]) / 14
    for t in trs[14:]:
        a = (a * 13 + t) / 14
    return a


def macd(closes):
    e12, e26 = ema_series(closes, 12), ema_series(closes, 26)
    if not e26:
        return None
    line = [a - b for a, b in zip(e12[-len(e26):], e26)]
    sig = ema_series(line, 9)
    if not sig:
        return None
    hist = [a - b for a, b in zip(line[-len(sig):], sig)]
    return {"macd": round(line[-1], 6), "signal": round(sig[-1], 6), "hist": round(hist[-1], 6),
            "hist_prev": round(hist[-2], 6) if len(hist) > 1 else None,
            "cross": ("bullish" if line[-1] > sig[-1] else "bearish")}


def classify_long_term(closes, s50, s200, lookback=20):
    """Daily regime: Uptrend / Downtrend / Range from price vs SMA200, SMA50/200 cross, slope."""
    if s200 is None or s50 is None:
        return "Insufficient data"
    last = closes[-1]
    slope_up = len(closes) > lookback and closes[-1] > closes[-1 - lookback]
    votes = int(last > s200) + int(s50 > s200) + int(slope_up)
    if votes >= 2 and last > s200:
        return "Uptrend"
    if votes <= 1 and last < s200:
        return "Downtrend"
    return "Range"


def classify_intraday_trend(hc, s20, s50, e9, e21):
    votes = 0
    votes += int(s50 is not None and hc[-1] > s50)
    votes += int(s20 is not None and hc[-1] > s20)
    votes += int(e9 is not None and e21 is not None and e9 > e21)
    votes += int(len(hc) > 24 and hc[-1] > hc[-25])
    if votes >= 3:
        return "Uptrend"
    if votes <= 1:
        return "Downtrend"
    return "Range"


def alignment_verdict(lt, it):
    if lt == it and lt in ("Uptrend", "Downtrend"):
        return "aligned-" + ("up" if lt == "Uptrend" else "down")
    if lt == "Range":
        return "mixed (long-term range)"
    if it == "Range":
        return "mixed (intraday range)"
    return "counter-trend (intraday against long-term)"


def level_stats(sessions_sorted, atr_d, max_n=120):
    """Empirical band-containment and pivot-touch rates over completed sessions.
    Approximation: uses the CURRENT ATR for all historical bands (documented)."""
    comp = sessions_sorted[:-1]  # exclude in-progress session
    pairs = list(zip(comp, comp[1:]))[-max_n:]
    if not pairs or not atr_d:
        return None
    inner = outer = pp_t = r1_t = s1_t = 0
    ranges = []
    for prev, cur in pairs:
        pp = (prev["h"] + prev["l"] + prev["c"]) / 3
        r1, s1 = 2 * pp - prev["l"], 2 * pp - prev["h"]
        move = abs(cur["c"] - prev["c"])  # net session move (prior close ~ session open in 24h markets)
        inner += move <= 0.5 * atr_d
        outer += move <= 1.0 * atr_d
        pp_t += cur["l"] <= pp <= cur["h"]
        r1_t += cur["h"] >= r1
        s1_t += cur["l"] <= s1
        ranges.append(cur["h"] - cur["l"])
    n = len(pairs)
    ranges.sort()
    return {
        "sessions_evaluated": n,
        "close_inside_inner_band_pct": round(100 * inner / n, 1),
        "close_inside_outer_band_pct": round(100 * outer / n, 1),
        "touched_PP_pct": round(100 * pp_t / n, 1),
        "touched_R1_pct": round(100 * r1_t / n, 1),
        "touched_S1_pct": round(100 * s1_t / n, 1),
        "median_session_range": round(ranges[n // 2], 6),
        "note": "containment = |close - prior close| vs current ATR(14) bands (approximation); touches use session H/L vs prior-session pivots",
    }


def swings(rows, k=2):
    """Confirmed swing highs/lows (fractal, k bars either side)."""
    hi, lo = [], []
    for i in range(k, len(rows) - k):
        win = rows[i - k:i + k + 1]
        if rows[i]["h"] == max(r["h"] for r in win):
            hi.append({"t": rows[i]["ts"], "p": rows[i]["h"]})
        if rows[i]["l"] == min(r["l"] for r in win):
            lo.append({"t": rows[i]["ts"], "p": rows[i]["l"]})
    return hi[-5:], lo[-5:]


def main():
    symbol = sys.argv[1]
    args = dict(zip(sys.argv[2::2], sys.argv[3::2]))
    name = args.get("--name", symbol.replace("=", "").replace("^", ""))
    datadir = Path(args.get("--datadir", "data"))
    candles_dir, analysis_dir = datadir / "candles", datadir / "analysis"
    hrange, drange = args.get("--hrange", "10d"), args.get("--drange", "1y")
    roll = int(args.get("--roll-utc", "0"))
    provider = args.get("--provider")
    rel_syms = [s.strip() for s in args.get("--related", "").split(",") if s.strip()]

    # Warm-up extension: fetch extra lookback BEFORE the display window so the
    # largest chart indicators (hourly SMA50, daily SMA200) are fully warmed at the
    # display-window start. Charts crop back to the display window downstream.
    DFETCH = {"1mo": "6mo", "3mo": "1y", "6mo": "2y", "1y": "2y", "2y": "5y",
              "5y": "10y", "10y": "max", "max": "max"}
    try:
        hdisp_days = int(hrange.strip().lower().rstrip("d"))
    except ValueError:
        hdisp_days = 10
    hfetch = f"{hdisp_days + 21}d"  # >=50 warm-up hourly bars even at ~7 bars/day
    dfetch = DFETCH.get(drange.strip().lower(), "2y")

    # all network fetches run concurrently (network-bound; stdlib threads)
    errors = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        fut_h = pool.submit(fetch_chart, symbol, "60m", hfetch, provider)
        fut_d = pool.submit(fetch_chart, symbol, "1d", dfetch, provider)
        fut_rel = [(rs, pool.submit(fetch_chart, rs, "1d", "10d", provider)) for rs in rel_syms]
        try:
            meta_h, hourly = fut_h.result()
        except Exception as ex:
            meta_h, hourly = None, []
            errors["hourly"] = str(ex)[:120]
        try:
            meta_d, daily = fut_d.result()
        except Exception as ex:
            meta_d, daily = None, []
            errors["daily"] = str(ex)[:120]
        related = []
        for rs, fut in fut_rel:
            try:
                _, rrows = fut.result()
                rc = [r["c"] for r in rrows]
                related.append({"symbol": rs, "last": round(rc[-1], 6),
                                "chg_1d_pct": round(100 * (rc[-1] / rc[-2] - 1), 2) if len(rc) > 1 else None,
                                "chg_5d_pct": round(100 * (rc[-1] / rc[-6] - 1), 2) if len(rc) > 5 else None})
            except Exception as ex:
                related.append({"symbol": rs, "error": str(ex)[:80]})

    if not daily:
        print(f"ERROR: no usable data for {symbol} "
              f"(hourly: {errors.get('hourly', 'ok')}; daily: {errors.get('daily', 'no bars')}). "
              f"Check the symbol format (BP.L, ^FTSE, GBPUSD=X, GC=F, BTC-USD) and network.",
              file=sys.stderr)
        sys.exit(2)

    degraded = None
    if len(hourly) < 24:
        degraded = "daily_only"
        errors.setdefault("hourly", f"only {len(hourly)} hourly bars (<24 minimum)")
        print(f"WARNING: degraded daily_only for {symbol} - {errors['hourly']}", file=sys.stderr)

    candles_dir.mkdir(parents=True, exist_ok=True)
    analysis_dir.mkdir(parents=True, exist_ok=True)
    with open(candles_dir / f"{name}_hourly.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        for r in hourly:
            w.writerow([datetime.fromtimestamp(r["ts"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M"),
                        f'{r["o"]:.6f}', f'{r["h"]:.6f}', f'{r["l"]:.6f}', f'{r["c"]:.6f}', r["v"]])
    with open(candles_dir / f"{name}_daily.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        for r in daily:
            w.writerow([datetime.fromtimestamp(r["ts"], tz=timezone.utc).strftime("%Y-%m-%d"),
                        f'{r["o"]:.6f}', f'{r["h"]:.6f}', f'{r["l"]:.6f}', f'{r["c"]:.6f}', r["v"]])

    dc = [r["c"] for r in daily]
    hc = [r["c"] for r in hourly]
    atr_d = atr14(daily)
    atr_h = atr14(hourly)

    # Prior completed session + today's session. Normal path: rebuilt from HOURLY bars so
    # boundaries are correct per asset class (--roll-utc N rolls the session day at N:00 UTC;
    # FX/crypto: 22, matching the New York close). Degraded path: last two DAILY bars.
    prior = today = None
    basis = None
    anchor = anchor_tag = None
    if not degraded:
        sessions = {}
        for r in hourly:
            day = datetime.fromtimestamp(r["ts"] - roll * 3600, tz=timezone.utc).date()
            s = sessions.setdefault(day, {"o": r["o"], "h": r["h"], "l": r["l"], "c": r["c"], "ts": r["ts"]})
            s["h"] = max(s["h"], r["h"]); s["l"] = min(s["l"], r["l"]); s["c"] = r["c"]
        skeys = sorted(sessions)
        if len(skeys) >= 2:
            prior, today = sessions[skeys[-2]], sessions[skeys[-1]]
            prior["date_label"], today["date_label"] = str(skeys[-2]), str(skeys[-1])
            anchor = today["o"]
        else:
            errors.setdefault("hourly_sessions",
                              "fewer than 2 hourly-built sessions; pivots from daily bars")
    if prior is None and len(daily) >= 2:
        pb, tb = daily[-2], daily[-1]
        prior = {"o": pb["o"], "h": pb["h"], "l": pb["l"], "c": pb["c"],
                 "date_label": datetime.fromtimestamp(pb["ts"], tz=timezone.utc).strftime("%Y-%m-%d")}
        today = {"o": tb["o"], "h": tb["h"], "l": tb["l"], "c": tb["c"],
                 "date_label": datetime.fromtimestamp(tb["ts"], tz=timezone.utc).strftime("%Y-%m-%d")}
        basis = "daily_bars_fallback"
        anchor, anchor_tag = tb["c"], "prior_close_fallback"

    pivots = None
    if prior:
        pp = (prior["h"] + prior["l"] + prior["c"]) / 3
        rng = prior["h"] - prior["l"]
        pivots = {"PP": pp, "R1": 2 * pp - prior["l"], "S1": 2 * pp - prior["h"],
                  "R2": pp + rng, "S2": pp - rng, "R3": prior["h"] + 2 * (pp - prior["l"]),
                  "S3": prior["l"] - 2 * (prior["h"] - pp)}
    bands = {"open": anchor,
             "inner_hi": anchor + 0.5 * atr_d, "inner_lo": anchor - 0.5 * atr_d,
             "outer_hi": anchor + 1.0 * atr_d, "outer_lo": anchor - 1.0 * atr_d} \
        if (atr_d and anchor is not None) else None

    # hourly trend read (normal path only)
    if not degraded:
        sh, sl = swings(hourly)
        e9, e21 = ema_series(hc, 9), ema_series(hc, 21)
        # session VWAP from today's session start (UTC date of last bar)
        last_day = datetime.fromtimestamp(hourly[-1]["ts"], tz=timezone.utc).date()
        sess = [r for r in hourly if datetime.fromtimestamp(r["ts"], tz=timezone.utc).date() == last_day]
        vol_sum = sum(r["v"] for r in sess)
        vwap = (sum(((r["h"] + r["l"] + r["c"]) / 3) * r["v"] for r in sess) / vol_sum) if vol_sum > 0 else None
        it_trend = classify_intraday_trend(hc, sma(hc, 20), sma(hc, 50),
                                           e9[-1] if e9 else None, e21[-1] if e21 else None)
        hourly_block = {
            "bars": len(hourly), "sma20": sma(hc, 20), "sma50": sma(hc, 50),
            "ema9": e9[-1] if e9 else None, "ema21": e21[-1] if e21 else None,
            "ema_cross": ("bullish" if e9 and e21 and e9[-1] > e21[-1] else "bearish") if e9 and e21 else None,
            "rsi14": rsi14(hc), "macd": macd(hc), "atr14": atr_h,
            "swing_highs": sh, "swing_lows": sl,
            "vwap_session": vwap,
            "above_sma20": hc[-1] > sma(hc, 20) if sma(hc, 20) else None,
        }
    else:
        it_trend = "Insufficient data"
        hourly_block = None

    rvol = None
    if len(dc) > 2:
        rets = [math.log(dc[i] / dc[i - 1]) for i in range(max(1, len(dc) - 20), len(dc))]
        if len(rets) > 1:
            mu = sum(rets) / len(rets)
            rvol = math.sqrt(sum((x - mu) ** 2 for x in rets) / (len(rets) - 1)) * math.sqrt(252) * 100

    d_s20, d_s50, d_s100, d_s200 = sma(dc, 20), sma(dc, 50), sma(dc, 100), sma(dc, 200)
    lt_trend = classify_long_term(dc, d_s50, d_s200)
    alignment = "unknown (no hourly data)" if degraded else alignment_verdict(lt_trend, it_trend)
    # Stats over the daily series (~1y) — Yahoo's own bar convention is self-consistent
    # for prev->cur pivot/containment relationships even where its FX day boundary differs
    # from the 22:00 UTC roll used for today's live pivots.
    stats = level_stats(daily, atr_d)

    # freshness from hourly bars whenever any exist (timestamps reflect feed lag
    # honestly even when too thin to analyze); daily bars only as a last resort
    if hourly:
        fresh = freshness_block(meta_h, hourly, granularity="hourly")
    else:
        fresh = freshness_block(meta_d, daily, granularity="daily")
    meta_best = (meta_d if degraded else meta_h) or {}
    notes = []
    for m in (meta_h, meta_d):
        if m and m.get("provider_note") and m["provider_note"] not in notes:
            notes.append(m["provider_note"])

    def session_out(s):
        if not s:
            return None
        d = {"date": s["date_label"], "o": s["o"], "h": s["h"], "l": s["l"], "c": s["c"],
             "session_roll_utc": roll}
        if basis:
            d["basis"] = basis
        return d

    pivots_out = {k: round(v, 6) for k, v in pivots.items()} if pivots else None
    if pivots_out and basis:
        pivots_out["basis"] = basis
    bands_out = {k: round(v, 6) for k, v in bands.items()} if bands else None
    if bands_out and anchor_tag:
        bands_out["anchor"] = anchor_tag

    # per-SMA warm-up sufficiency at the DISPLAY-window start (charts crop to display):
    # warm = at least n bars exist BEFORE the display cutoff, so the SMA(n)/RSI line
    # is valid from the first visible bar. Never infer trend from a cold SMA.
    def warm(rows_all, disp_seconds, n):
        if not rows_all:
            return False
        cutoff = rows_all[-1]["ts"] - disp_seconds
        return sum(1 for r in rows_all if r["ts"] < cutoff) >= n

    h_secs = hdisp_days * 86400
    d_secs = int(range_to_timedelta(drange).total_seconds())
    windows = {
        "hourly_display": hrange, "hourly_fetched": hfetch,
        "daily_display": drange, "daily_fetched": dfetch,
        "sma_warm_at_display_start": {
            "h20": warm(hourly, h_secs, 20), "h50": warm(hourly, h_secs, 50),
            "rsi14_hourly": warm(hourly, h_secs, 15),
            "d50": warm(daily, d_secs, 50), "d200": warm(daily, d_secs, 200),
            "rsi14_daily": warm(daily, d_secs, 15),
        },
    }

    out = {
        "symbol": symbol, "timezone": meta_best.get("exchangeTimezoneName"),
        "fetched_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "last_price": meta_best.get("regularMarketPrice"),
        "last_bar_utc": fresh["last_bar_utc"],
        "degraded": degraded,
        "errors": errors or None,
        "freshness": fresh,
        "windows": windows,
        "provider": {"hourly": meta_h.get("provider") if meta_h else None,
                     "daily": meta_d.get("provider") if meta_d else None,
                     "note": "; ".join(notes) if notes else None},
        "hourly": hourly_block,
        "trend": {
            "long_term_daily": lt_trend,
            "intraday_hourly": it_trend,
            "alignment": alignment,
            "golden_cross": (d_s50 > d_s200) if (d_s50 and d_s200) else None,
        },
        "stats_last_sessions": stats,
        "related": related,
        "daily": {
            "bars": len(daily), "sma20": d_s20, "sma50": d_s50, "sma100": d_s100, "sma200": d_s200,
            "rsi14": rsi14(dc), "atr14": atr_d,
            "realized_vol_20d_pct": round(rvol, 1) if rvol is not None else None,
            "prior_session": session_out(prior),
            "today_session": session_out(today),
        },
        "pivots_classic": pivots_out,
        "atr_day_bands": bands_out,
        "files": {"hourly_csv": (candles_dir / f"{name}_hourly.csv").as_posix(),
                  "daily_csv": (candles_dir / f"{name}_daily.csv").as_posix()},
    }
    (analysis_dir / f"{name}_analysis.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()

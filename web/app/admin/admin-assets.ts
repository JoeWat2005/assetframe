"use server";
import { randomUUID } from "node:crypto";
import { logAudit } from "@/lib/audit";
import { signalEngineWake } from "@/lib/upstash";
import { isValidSlug } from "@/lib/report-key";
import { sql } from "@/lib/db";
import { requireAdmin } from "./admin-auth";
import type { Result, AssetInput } from "@/lib/admin-types";

// ------------------------------------------------------------ Asset universe (engine_assets)
// The admin-editable list of WHAT the engine generates reports for. Every mutation writes
// engine_assets (the dashboard's source of truth) and enqueues a `sync_assets` box command so the
// box rewrites config/assets.json — but only after the engine's config_loader validates it. Enum
// values mirror scripts/config_loader.py; the engine re-validates, so this is the convenience copy.
const ASSET_CLASSES = ["equity", "crypto", "fx", "futures", "index", "commodity"];
const SESSION_PROFILES = ["fx_spot", "crypto_24_7", "us_equity_rth", "cme_futures"];
const CADENCES = ["daily", "weekday", "trading_day", "weekday_or_market_open", "weekly", "monthly"];
const FORECAST_WINDOWS = ["next_liquid_session", "next_regular_session", "rolling_24h", "next_session", "next_week", "next_5_sessions"];
const CHART_INTERVALS = ["60m", "2h", "4h", "8h", "1d", "1week", "1month"];
const PUBLISH_POLICIES = ["approval_required", "auto"];
const REPORT_TIERS = ["official", "watchlist", "staged", "backtest"];
const TIMEZONES = [
  "UTC", "Europe/London", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore", "Australia/Sydney",
  "Europe/Zurich", "Europe/Frankfurt", "Europe/Paris",
];

// Push config/assets.json on the box up to date with engine_assets (validated box-side).
async function enqueueSyncAssets(): Promise<void> {
  if (!sql) return;
  try {
    await sql.query(
      `INSERT INTO engine_commands (id, command, args, requested_by, status)
       VALUES ($1, 'sync_assets', '{}'::jsonb, $2, 'queued')`,
      [randomUUID(), "asset-edit"]
    );
    await signalEngineWake();
  } catch {
    /* engine_commands not migrated yet */
  }
}

export async function upsertEngineAsset(input: AssetInput): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  const id = (input.id || "").trim().toLowerCase();
  const ticker = (input.ticker || "").trim().toUpperCase();
  const yahoo = (input.yahoo || "").trim();
  if (!/^[a-z0-9_]+$/.test(id)) return { ok: false, message: "id must be lowercase letters/numbers/underscore." };
  if (!ticker) return { ok: false, message: "ticker is required." };
  // The ticker becomes the edition slug, which the report-key / R2 route validates against a
  // strict charset (letters, numbers, hyphen, underscore). Reject here anything that route
  // would reject (e.g. a '.' as in "BRK.B") so an admin can never create an asset whose reports
  // 404 downstream — admin-accepted and routable stay in lockstep. (Same grammar, not looser.)
  if (!isValidSlug(ticker)) {
    return { ok: false, message: "Ticker can only contain letters, numbers, hyphens and underscores (no dots or spaces) — it's used in the report URL. Try e.g. BRK-B instead of BRK.B." };
  }
  if (!yahoo) return { ok: false, message: "Yahoo symbol is required (the price feed)." };
  if (!input.name?.trim() || !input.instrument?.trim()) return { ok: false, message: "name and instrument are required." };
  if (!ASSET_CLASSES.includes(input.assetClass)) return { ok: false, message: "Invalid asset class." };
  if (!SESSION_PROFILES.includes(input.sessionProfile)) return { ok: false, message: "Invalid session profile." };
  if (!CADENCES.includes(input.cadence)) return { ok: false, message: "Invalid cadence." };
  if (!TIMEZONES.includes(input.timezone)) return { ok: false, message: "Invalid timezone." };
  const publishPolicy = PUBLISH_POLICIES.includes(input.publishPolicy ?? "") ? input.publishPolicy! : "approval_required";
  const forecastWindow = FORECAST_WINDOWS.includes(input.forecastWindow ?? "") ? input.forecastWindow! : "next_session";
  const reportTier = REPORT_TIERS.includes(input.reportTier ?? "") ? input.reportTier! : "official";
  const roll = Math.max(0, Math.min(23, Math.round(Number(input.rollUtc) || 0)));
  const enabled = input.enabled !== false;
  const providerSymbols: Record<string, string> = { yahoo };
  const eodhd = (input.eodhd || "").trim();
  if (eodhd) providerSymbols.eodhd = eodhd;
  // multi-timeframe + per-asset fetch config (mirrors scripts/config_loader.py validation)
  const timeframes = Array.isArray(input.timeframes)
    ? Array.from(new Set(input.timeframes.filter((t) => FORECAST_WINDOWS.includes(t))))
    : [];
  // chart_intervals: candle intervals the engine analyses. Default + force-include the canonical
  // 60m+1d pair (the rest of the pipeline depends on it), mirroring config_loader normalization.
  const chartIntervals = (() => {
    const picked = Array.isArray(input.chartIntervals)
      ? input.chartIntervals.filter((i) => CHART_INTERVALS.includes(i)) : [];
    return Array.from(new Set(["60m", "1d", ...picked]));
  })();
  const cadenceDay = ((): string | null => {
    const v = String(input.cadenceDay ?? "").trim().toLowerCase();
    if (!v) return null;
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= 6) return String(n);
    return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(v.slice(0, 3)) ? v.slice(0, 3) : null;
  })();
  const includeNews = input.includeNews !== false;
  const includeFundamentals = input.includeFundamentals == null ? null : Boolean(input.includeFundamentals);
  const fundamentalsSource = ["auto", "twelvedata", "none"].includes(input.fundamentalsSource ?? "")
    ? input.fundamentalsSource! : "auto";
  try {
    await sql.query(
      `INSERT INTO engine_assets (id, name, instrument, ticker, provider_symbols, asset_class, session_profile,
         cadence, timezone, roll_utc, related, forecast_window, publish_policy, report_tier, enabled,
         cadence_day, timeframes, include_fundamentals, include_news, fundamentals_source, chart_intervals, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET name=excluded.name, instrument=excluded.instrument, ticker=excluded.ticker,
         provider_symbols=excluded.provider_symbols, asset_class=excluded.asset_class, session_profile=excluded.session_profile,
         cadence=excluded.cadence, timezone=excluded.timezone, roll_utc=excluded.roll_utc, related=excluded.related,
         forecast_window=excluded.forecast_window, publish_policy=excluded.publish_policy, report_tier=excluded.report_tier,
         enabled=excluded.enabled, cadence_day=excluded.cadence_day, timeframes=excluded.timeframes,
         include_fundamentals=excluded.include_fundamentals, include_news=excluded.include_news,
         fundamentals_source=excluded.fundamentals_source, chart_intervals=excluded.chart_intervals, updated_at=now()`,
      [id, input.name.trim(), input.instrument.trim(), ticker, JSON.stringify(providerSymbols), input.assetClass,
       input.sessionProfile, input.cadence, input.timezone, roll, (input.related || "").trim(),
       forecastWindow, publishPolicy, reportTier, enabled,
       cadenceDay, JSON.stringify(timeframes), includeFundamentals, includeNews, fundamentalsSource,
       JSON.stringify(chartIntervals)]
    );
    await logAudit({ actor: ent.email, action: "asset_upsert", target: id, detail: `${ticker} (${input.assetClass})` });
    await enqueueSyncAssets();
    return { ok: true, message: `Saved ${ticker} — syncing to the engine.` };
  } catch {
    return { ok: false, message: "Couldn't save — has the engine-assets migration been applied?" };
  }
}

export async function deleteEngineAsset(id: string): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  const cleaned = (id || "").trim().toLowerCase();
  if (!cleaned) return { ok: false, message: "Bad id." };
  try {
    await sql.query(`DELETE FROM engine_assets WHERE id = $1`, [cleaned]);
    await logAudit({ actor: ent.email, action: "asset_delete", target: cleaned, detail: "removed from universe" });
    await enqueueSyncAssets();
    return { ok: true, message: `Removed ${cleaned} — syncing.` };
  } catch {
    return { ok: false, message: "Delete failed." };
  }
}

export async function setAssetEnabled(id: string, enabled: boolean): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  const cleaned = (id || "").trim().toLowerCase();
  if (!cleaned) return { ok: false, message: "Bad id." };
  try {
    await sql.query(`UPDATE engine_assets SET enabled = $2, updated_at = now() WHERE id = $1`, [cleaned, enabled]);
    await logAudit({ actor: ent.email, action: enabled ? "asset_enable" : "asset_disable", target: cleaned, detail: enabled ? "in daily universe" : "out of daily universe" });
    await enqueueSyncAssets();
    return { ok: true, message: `${cleaned} ${enabled ? "enabled" : "disabled"}.` };
  } catch {
    return { ok: false, message: "Update failed." };
  }
}

// Global approval toggle — set EVERY asset's publish_policy. require=true => approval_required
// (you approve each report); false => auto (reports publish straight away when generated).
export async function setRequireApproval(requireApproval: boolean): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  const policy = requireApproval ? "approval_required" : "auto";
  try {
    await sql.query(`UPDATE engine_assets SET publish_policy = $1, updated_at = now()`, [policy]);
    await logAudit({ actor: ent.email, action: "asset_approval_mode", target: "all", detail: policy });
    await enqueueSyncAssets();
    return { ok: true, message: requireApproval ? "New reports now require your approval." : "New reports will auto-publish." };
  } catch {
    return { ok: false, message: "Update failed." };
  }
}

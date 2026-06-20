import "server-only";
import { sql } from "./db";

// The dashboard-editable asset universe (engine_assets). The admin edits these rows; a `sync_assets`
// box command pushes them to config/assets.json on the box (after the engine validates them). Mirrors
// scripts/config_loader.py. Read layer only — mutations are admin server actions in app/admin/actions.ts.

export type EngineAsset = {
  id: string;
  name: string;
  instrument: string;
  ticker: string;
  providerSymbols: Record<string, string>;
  assetClass: string;
  sessionProfile: string;
  cadence: string;
  timezone: string;
  rollUtc: number;
  related: string;
  forecastWindow: string;
  publishPolicy: string; // approval_required | auto
  reportTier: string;
  enabled: boolean;
  sortOrder: number;
  due: boolean | null; // computed by the box's compute_due; null = not checked yet
  dueReason: string;
  dueCheckedAt: string; // "YYYY-MM-DD HH:MI" UTC, or ""
};

const s = (v: unknown): string => (v == null ? "" : String(v));

const BASE_COLS = `id, name, instrument, ticker, provider_symbols, asset_class, session_profile, cadence,
              timezone, roll_utc, related, forecast_window, publish_policy, report_tier, enabled, sort_order`;
const DUE_COLS = `, due, coalesce(due_reason, '') AS due_reason,
              to_char(due_checked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS due_checked_at`;

export async function getEngineAssets(): Promise<EngineAsset[]> {
  if (!sql) return [];
  let rows: Record<string, unknown>[] = [];
  try {
    // Try the rich projection (with the due columns); fall back to the base one if the
    // 1750000022000 migration hasn't been applied yet, so the table still renders.
    rows = (await sql.query(`SELECT ${BASE_COLS}${DUE_COLS} FROM engine_assets ORDER BY sort_order, id`)) as Record<string, unknown>[];
  } catch {
    try {
      rows = (await sql.query(`SELECT ${BASE_COLS} FROM engine_assets ORDER BY sort_order, id`)) as Record<string, unknown>[];
    } catch {
      return []; // table not migrated yet
    }
  }
  return rows.map((r) => ({
    id: s(r.id),
    name: s(r.name),
    instrument: s(r.instrument),
    ticker: s(r.ticker),
    providerSymbols: (r.provider_symbols ?? {}) as Record<string, string>,
    assetClass: s(r.asset_class),
    sessionProfile: s(r.session_profile),
    cadence: s(r.cadence),
    timezone: s(r.timezone),
    rollUtc: Number(r.roll_utc) || 0,
    related: s(r.related),
    forecastWindow: s(r.forecast_window),
    publishPolicy: s(r.publish_policy),
    reportTier: s(r.report_tier),
    enabled: Boolean(r.enabled),
    sortOrder: Number(r.sort_order) || 0,
    due: r.due == null ? null : Boolean(r.due),
    dueReason: s(r.due_reason),
    dueCheckedAt: s(r.due_checked_at),
  }));
}

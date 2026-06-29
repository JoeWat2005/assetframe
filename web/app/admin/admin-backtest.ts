"use server";
import { randomUUID } from "node:crypto";
import { logAudit } from "@/lib/audit";
import { signalEngineWake } from "@/lib/upstash";
import { sql } from "@/lib/db";
import { requireAdmin } from "./admin-auth";
import type { Result } from "@/lib/admin-types";

// Clear the sandbox BACKTEST results — admin-only test data that never touches the public site.
// Wipes the Neon backtest_results table (what the admin "Backtest results" card reads) AND enqueues
// a `clear_sandbox` box command so the box resets its own sandbox sim trees — keeping the two in
// sync. Destructive but harmless to production: the live ledger, editions, R2 and track record are
// untouched. The UI confirms first.
export async function clearBacktestResults(): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  try {
    await sql.query(`DELETE FROM backtest_results`);
    // Also wipe the full per-prediction detail (backtest_predictions) so clearing resets BOTH tables
    // — the result rows and the prediction list the engine syncs alongside them stay in lockstep.
    await sql.query(`DELETE FROM backtest_predictions`);
    // Also reset the box's sandbox sim trees so a fresh backtest starts clean. Best-effort — the
    // Neon rows are cleared either way; the box command is queued for its next poll.
    try {
      await sql.query(
        `INSERT INTO engine_commands (id, command, args, requested_by, status)
         VALUES ($1, 'clear_sandbox', '{}'::jsonb, $2, 'queued')`,
        [randomUUID(), ent.email ?? null]
      );
      await signalEngineWake();
    } catch {
      /* engine_commands not migrated yet — Neon results still cleared */
    }
    await logAudit({ actor: ent.email, action: "clear_sandbox", target: "backtest_results", detail: "sandbox backtest results cleared" });
    return { ok: true, message: "Cleared the sandbox backtest results (box resetting its sim trees)." };
  } catch {
    return { ok: false, message: "Couldn't clear the backtest results — has the migration been applied?" };
  }
}

// Manually grade a MANUAL sandbox prediction from the admin Backtest results card. Sets the
// outcome on a single backtest_predictions row (keyed by report_id + pred_id). outcome ∈ Y (Hit) |
// N (Miss) | NT (No-trigger) | null (Clear — back to "needs review"). Admin-only test data; never
// touches the public site. Parameterized UPDATE, audit-logged.
export async function setBacktestManualOutcome(
  reportId: string,
  predId: string,
  outcome: string | null
): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  const report = (reportId || "").trim();
  const pred = (predId || "").trim();
  if (!report || !pred) return { ok: false, message: "Bad prediction reference." };
  // Only the three graded codes (or null to clear) are settable by hand — MANUAL/"" aren't valid here.
  const o = outcome == null || outcome === "" ? null : String(outcome).trim().toUpperCase();
  if (o !== null && !["Y", "N", "NT"].includes(o)) return { ok: false, message: "Bad outcome." };
  try {
    const rows = (await sql.query(
      `UPDATE backtest_predictions SET outcome = $3 WHERE report_id = $1 AND pred_id = $2 RETURNING pred_id`,
      [report, pred, o]
    )) as Record<string, unknown>[];
    if (rows.length === 0) return { ok: false, message: "Prediction not found." };
    await logAudit({
      actor: ent.email, action: "backtest_manual_outcome",
      target: `${report}/${pred}`, detail: o == null ? "cleared" : `→ ${o}`,
    });
    return { ok: true, message: o == null ? "Cleared the outcome." : `Marked ${o === "Y" ? "Hit" : o === "N" ? "Miss" : "No-trigger"}.` };
  } catch {
    return { ok: false, message: "Couldn't update — has the backtest_predictions migration been applied?" };
  }
}

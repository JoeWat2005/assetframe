"use server";
import { revalidateTag } from "next/cache";
import { logAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { requireAdmin } from "./admin-auth";
import type { Result } from "@/lib/admin-types";

// Unpublish (hide) or restore an edition. Hidden editions disappear from the public site,
// sitemap and reader, but stay in the DB. The report files in R2 are untouched.
export async function setEditionHidden(id: string, hidden: boolean): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  // Edition ids are `<YYYY-MM-DD>/<slug>`. Allow the full real slug charset (incl. '.') so a dotted
  // or edge ticker (e.g. BRK.B) can still be toggled — the engine sanitizes slugs, and the UPDATE is
  // parameterized, so this is just shape validation, not the security boundary.
  if (!/^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9._-]+$/.test(id)) return { ok: false, message: "Bad edition id." };
  try {
    await sql.query(`UPDATE editions SET hidden = $2 WHERE id = $1`, [id, hidden]);
    await logAudit({
      actor: ent.email, action: hidden ? "unpublish_report" : "publish_report",
      target: id, detail: hidden ? "hidden from the public site" : "restored",
    });
    revalidateTag("content", "max");
    return { ok: true, message: hidden ? `Unpublished ${id}.` : `Restored ${id}.` };
  } catch {
    return { ok: false, message: "Database update failed." };
  }
}

// Force-refresh the content cache (catalog, track record, admin stats).
export async function revalidateContent(): Promise<Result> {
  const ent = await requireAdmin();
  revalidateTag("content", "max");
  await logAudit({ actor: ent.email, action: "revalidate", target: "content", detail: "manual cache bust" });
  return { ok: true, message: "Cleared the content cache — stats, catalog and track record will refresh." };
}

// Clear the public catalog in Neon — deletes editions (cascades to open_calls + predictions) and
// the scored_results. The Neon side of a full reset (pair with the box's clear_reports + reset_ledger).
// Destructive; the UI confirms. Does NOT touch R2 files (use clear_r2) or the engine_assets universe.
export async function clearCatalog(): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  try {
    await sql.query(`DELETE FROM scored_results`);
    await sql.query(`DELETE FROM editions`); // cascades to open_calls -> open_call_predictions
    await logAudit({ actor: ent.email, action: "clear_catalog", target: "neon", detail: "editions + scored cleared" });
    revalidateTag("content", "max");
    return { ok: true, message: "Catalog cleared (editions, open calls, scored results)." };
  } catch {
    return { ok: false, message: "Couldn't clear the catalog." };
  }
}

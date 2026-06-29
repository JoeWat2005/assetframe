"use server";
import { randomUUID } from "node:crypto";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getEngineAssets } from "@/lib/engine-assets";
import { getEngineState } from "@/lib/engine";
import { signalEngineWake } from "@/lib/upstash";
import { sql } from "@/lib/db";
import { requireAdmin } from "./admin-auth";
import type { Result, EngineScope } from "@/lib/admin-types";

// ------------------------------------------------------------------ Engine ops
// These coordinate the Oracle Cloud VM that runs the Python engine. The VM has no inbound
// ports, so we only ever WRITE rows to Neon here — the VM polls them. We never execute the
// engine ourselves (consistent with the no-auto-trading posture: the web app is control-plane).

// Enqueue a generation run. Validates the scope against the known edition slugs, then inserts a
// 'queued' generation_requests row with a fresh uuid. The VM's poller claims it from there.
export async function requestGeneration(
  scope: EngineScope
): Promise<{ ok: boolean; message: string; id?: string }> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };

  // Rate-limit per admin so a stuck client can't flood the queue. No-op until Upstash is set.
  const rl = await rateLimit(`engine:request:${ent.email ?? "admin"}`, { limit: 10, windowSec: 60 });
  if (!rl.ok) return { ok: false, message: "Too many requests — please slow down." };

  // Normalise + validate the scope. Either {all_due:true} or {assets:[...known slugs]}.
  let normalized: EngineScope;
  let summary: string;
  if (scope && "all_due" in scope && scope.all_due === true) {
    // Guard the silent no-op: "All due" with nothing enabled would run + generate zero reports.
    const enabledCount = (await getEngineAssets()).filter((a) => a.enabled).length;
    if (enabledCount === 0) return { ok: false, message: "No assets are enabled — enable at least one in the Asset universe first." };
    normalized = { all_due: true };
    summary = `all due (${enabledCount} enabled)`;
  } else if (scope && "assets" in scope && Array.isArray(scope.assets)) {
    // Match case-insensitively — edition slugs are upper-case (e.g. "ETH"), but the picker/user
    // input may differ in case — while keeping the canonical slug so the engine receives the exact
    // id it published the edition under.
    // Validate against the ASSET UNIVERSE (engine_assets, enabled) — not the published catalog —
    // so you can generate an instrument before its first edition exists. The engine runs
    // `--asset <id>`, so we pass the lowercase asset ids.
    const known = new Map((await getEngineAssets()).filter((a) => a.enabled).map((a) => [a.id.toLowerCase(), a.id] as const));
    const requested = [...new Set(scope.assets.map((a) => String(a).trim().toLowerCase()).filter(Boolean))];
    const assets = requested.map((a) => known.get(a)).filter((s): s is string => Boolean(s));
    const unknown = requested.filter((a) => !known.has(a));
    if (assets.length === 0) return { ok: false, message: "Select at least one enabled asset." };
    if (unknown.length) return { ok: false, message: `Unknown or disabled asset(s): ${unknown.join(", ")}.` };
    normalized = { assets };
    summary = assets.join(", ");
  } else {
    return { ok: false, message: "Bad scope." };
  }

  // Optional BACKDATE (as-of): generate for a past time so the prediction window is already closed
  // — used to test scoring/the ledger immediately. Accept "YYYY-MM-DDTHH:MM" or with a space.
  const asOfRaw = (scope as { as_of?: string })?.as_of;
  if (typeof asOfRaw === "string" && asOfRaw.trim()) {
    const v = asOfRaw.trim().replace("T", " ").slice(0, 16);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) return { ok: false, message: "Bad backdate — pick a valid date/time." };
    normalized.as_of = v;
    summary += ` as-of ${v} UTC`;
  }

  try {
    const id = randomUUID();
    await sql.query(
      `INSERT INTO generation_requests (id, requested_by, scope, status)
       VALUES ($1, $2, $3::jsonb, 'queued')`,
      [id, ent.email ?? null, JSON.stringify(normalized)]
    );
    await logAudit({ actor: ent.email, action: "engine_request", target: id, detail: summary });
    // Wake the OCI poller now (via Upstash) so it picks the request up on its next ~30s tick
    // instead of waiting for its periodic Neon safety sweep. Best-effort — the row is queued either way.
    await signalEngineWake();
    // Be honest if the box is offline — the row is queued either way, but it won't run until the
    // engine reconnects (otherwise a green "Queued" looks like it's generating when nothing is).
    const online = (await getEngineState().catch(() => ({ online: true }))).online;
    return {
      ok: true,
      message: online
        ? `Queued a run for ${summary}.`
        : `Queued for ${summary} — but the engine is OFFLINE, so it won't run until the box reconnects.`,
      id,
    };
  } catch {
    return { ok: false, message: "Couldn't queue the run — has the engine migration been applied?" };
  }
}

// Pause or resume the daily automation (the engine checks this flag before its scheduled run).
export async function setAutomationPaused(paused: boolean): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  try {
    await sql.query(
      `UPDATE engine_state SET automation_paused = $1, updated_at = now() WHERE id = 1`,
      [paused]
    );
    await logAudit({
      actor: ent.email, action: paused ? "engine_pause" : "engine_resume",
      target: "automation", detail: paused ? "daily automation paused" : "daily automation resumed",
    });
    return { ok: true, message: paused ? "Daily automation paused." : "Daily automation resumed." };
  } catch {
    return { ok: false, message: "Couldn't update — has the engine migration been applied?" };
  }
}

// Request cancellation of a queued/running generation. cancel_requested is co-operative: the VM
// checks it and stops at the next safe point (we can't force-kill a process with no inbound ports).
export async function cancelGenerationRequest(id: string): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  const cleaned = (id || "").trim();
  if (!cleaned) return { ok: false, message: "Bad request id." };
  try {
    const rows = (await sql.query(
      `UPDATE generation_requests SET cancel_requested = true
        WHERE id = $1 AND status IN ('queued','running')
        RETURNING id`,
      [cleaned]
    )) as Record<string, unknown>[];
    if (rows.length === 0) return { ok: false, message: "Nothing to cancel — already finished?" };
    await logAudit({ actor: ent.email, action: "engine_cancel", target: cleaned, detail: "cancellation requested" });
    return { ok: true, message: "Cancellation requested." };
  } catch {
    return { ok: false, message: "Couldn't request cancellation." };
  }
}

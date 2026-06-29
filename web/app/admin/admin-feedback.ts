"use server";
import { logAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { requireAdmin } from "./admin-auth";
import type { Result } from "@/lib/admin-types";

// Move a feedback submission through its lifecycle (new → triaged → planned → done/declined).
const FEEDBACK_STATUSES = ["new", "triaged", "planned", "done", "declined"];
export async function setFeedbackStatus(id: string, status: string): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  if (!FEEDBACK_STATUSES.includes(status)) return { ok: false, message: "Bad status." };
  if (!/^\d+$/.test(id)) return { ok: false, message: "Bad feedback id." };
  try {
    await sql.query(`UPDATE feedback SET status = $2 WHERE id = $1`, [id, status]);
    await logAudit({ actor: ent.email, action: "feedback_status", target: `feedback#${id}`, detail: `→ ${status}` });
    return { ok: true, message: `Marked ${status}.` };
  } catch {
    return { ok: false, message: "Update failed." };
  }
}

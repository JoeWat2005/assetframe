import "server-only";
import { sql } from "./db";

export type FeedbackRow = {
  id: string;
  createdAt: string; // "YYYY-MM-DD HH:MI" UTC
  email: string;
  category: string;
  message: string;
  status: string;
  adminNotes: string;
};

// Read the feedback inbox for the admin dashboard. Guarded: returns [] if the DB (or the
// feedback table) isn't there yet, so the page never errors before the migration is applied.
export async function getFeedback(limit = 500): Promise<FeedbackRow[]> {
  if (!sql) return [];
  try {
    const rows = (await sql.query(
      `SELECT id, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
              coalesce(email, '') AS email, category, message, status,
              coalesce(admin_notes, '') AS admin_notes
         FROM feedback
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit]
    )) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      createdAt: String(r.created_at),
      email: String(r.email),
      category: String(r.category),
      message: String(r.message),
      status: String(r.status),
      adminNotes: String(r.admin_notes),
    }));
  } catch {
    return [];
  }
}

import { sql } from "@/lib/db";
import { rateLimitResponse, getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Fire-and-forget view counter for the "Popular this week" rail. Always returns 204 — a
// failed count must never surface to the reader. Dedupe happens client-side (per session).
export async function POST(req: Request) {
  const lr = await rateLimitResponse(req, `view:${getRequestIp(req)}`, { limit: 30, windowSec: 60 });
  if (lr) return lr;
  try {
    const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    if (sql && /^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+$/.test(id)) {
      await sql.query(
        `INSERT INTO report_views (edition_id, day, count) VALUES ($1, CURRENT_DATE, 1)
         ON CONFLICT (edition_id, day) DO UPDATE SET count = report_views.count + 1`,
        [id]
      );
    }
  } catch {
    /* swallow — view counting is best-effort */
  }
  return new Response(null, { status: 204 });
}

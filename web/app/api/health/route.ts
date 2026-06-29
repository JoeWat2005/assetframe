import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public health probe for uptime monitors (UptimeRobot, BetterStack, etc.). No auth, no secrets,
// no rate limit (monitors poll frequently). Returns 200 when the app + DB are reachable; 503 when
// the DB is configured but unreachable, so a monitor can alert on real degradation. With no DB
// configured the app still serves from the JSON catalog, so that counts as up.
export async function GET() {
  let db: boolean | null = null;
  if (sql) {
    try {
      await sql.query("SELECT 1");
      db = true;
    } catch {
      db = false;
    }
  }
  const ok = db !== false;
  return Response.json(
    { ok, db, ts: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

import { getTrackRecordPayload } from "@/lib/reports-api";
import { apiJson, apiPreflight } from "@/lib/http";
import { rateLimitResponseWithHeaders, getRequestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/v1/track-record — PUBLIC (no key required), per-IP rate limit: 120 req/min.
// Optional ?timeframe=daily|weekly|hourly filters to one horizon; the payload always carries the
// per-timeframe breakdown (byHorizon).
export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const rl = await rateLimitResponseWithHeaders(req, `ip:${ip}`, { limit: 120, windowSec: 60 });
  if (rl) return rl;

  const timeframe = new URL(req.url).searchParams.get("timeframe") || undefined;
  return apiJson(await getTrackRecordPayload({ horizon: timeframe }));
}

export function OPTIONS() {
  return apiPreflight();
}

import { apiJson, apiPreflight } from "@/lib/http";
import { requireApiKey } from "@/lib/api-auth";
import { rateLimitResponseWithHeaders } from "@/lib/rate-limit";
import { getHistory } from "@/lib/market-data";

export const dynamic = "force-dynamic";

const SYM = /^[A-Za-z0-9.\-=^]{1,20}$/;

// GET /api/v1/data/history?symbol=AAPL&days=90&interval=1d — OHLC candles for any instrument,
// multi-provider with fallback. Requires an API key; rate-limited on the dedicated `data:` pool.
export async function GET(req: Request) {
  const auth = await requireApiKey(req);
  if (auth instanceof Response) return auth;
  const rl = await rateLimitResponseWithHeaders(req, `data:${auth.clerkUserId}`, { limit: 60, windowSec: 60 });
  if (rl) return rl;

  const sp = new URL(req.url).searchParams;
  const symbol = (sp.get("symbol") || "").trim();
  if (!SYM.test(symbol)) {
    return apiJson({ error: "bad_request", message: "Provide ?symbol= (e.g. AAPL, BTC-USD, GC=F)." }, { status: 400 });
  }
  const daysRaw = parseInt(sp.get("days") || "30", 10);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(365, daysRaw)) : 30;
  const interval: "1h" | "1d" = sp.get("interval") === "1h" ? "1h" : "1d";
  try {
    return apiJson(await getHistory(symbol, { days, interval }));
  } catch {
    return apiJson({ error: "unavailable", message: `No history for "${symbol}" from any provider.` }, { status: 502 });
  }
}

export function OPTIONS() {
  return apiPreflight();
}

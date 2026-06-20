import { apiJson, apiPreflight } from "@/lib/http";
import { requireApiKey } from "@/lib/api-auth";
import { rateLimitResponseWithHeaders } from "@/lib/rate-limit";
import { getQuote } from "@/lib/market-data";

export const dynamic = "force-dynamic";

const SYM = /^[A-Za-z0-9.\-=^]{1,20}$/;

// GET /api/v1/data/quote?symbol=BTC-USD — latest price for any instrument, multi-provider
// (Yahoo primary, CoinGecko fallback for crypto). Requires an API key; rate-limited on a
// dedicated `data:` pool so it can be monetised independently of the report endpoints.
export async function GET(req: Request) {
  const auth = await requireApiKey(req);
  if (auth instanceof Response) return auth;
  const rl = await rateLimitResponseWithHeaders(req, `data:${auth.clerkUserId}`, { limit: 60, windowSec: 60 });
  if (rl) return rl;

  const symbol = (new URL(req.url).searchParams.get("symbol") || "").trim();
  if (!SYM.test(symbol)) {
    return apiJson(
      { error: "bad_request", message: "Provide ?symbol= (e.g. BTC-USD, AAPL, GBPUSD=X, GC=F, ^GSPC)." },
      { status: 400 }
    );
  }
  try {
    return apiJson(await getQuote(symbol));
  } catch {
    return apiJson({ error: "unavailable", message: `No quote for "${symbol}" from any provider.` }, { status: 502 });
  }
}

export function OPTIONS() {
  return apiPreflight();
}

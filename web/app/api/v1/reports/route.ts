import { listReports } from "@/lib/reports-api";
import { apiJson, apiPreflight } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/v1/reports?asset_class=&status=&date=&q=&limit=
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const limitRaw = Number(sp.get("limit"));
  const data = await listReports({
    assetClass: sp.get("asset_class") || undefined,
    status: sp.get("status") || undefined,
    date: sp.get("date") || undefined,
    query: sp.get("q") || undefined,
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
  });
  return apiJson(data);
}

export function OPTIONS() {
  return apiPreflight();
}

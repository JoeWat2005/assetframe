import { getReportDetail } from "@/lib/reports-api";
import { apiJson, apiPreflight } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/v1/reports/{date}/{slug} — free Snapshot detail (metadata + text + short-lived PDF link).
export async function GET(_req: Request, ctx: { params: Promise<{ date: string; slug: string }> }) {
  const { date, slug } = await ctx.params;
  const data = await getReportDetail(date, slug);
  if (!data) return apiJson({ error: "not_found", message: "No published report for that date/slug." }, { status: 404 });
  return apiJson(data);
}

export function OPTIONS() {
  return apiPreflight();
}

import { getTrackRecordPayload } from "@/lib/reports-api";
import { apiJson, apiPreflight } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/v1/track-record — public scored-prediction stats + calibration.
export async function GET() {
  return apiJson(await getTrackRecordPayload());
}

export function OPTIONS() {
  return apiPreflight();
}

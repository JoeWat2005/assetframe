// Tiny helpers for the public read-only REST API (/api/v1/*). Free catalog data, so wide-open
// CORS GETs are fine. Short browser cache + CDN cache keeps it cheap.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function apiJson(data: unknown, init?: { status?: number }) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      ...CORS,
    },
  });
}

export function apiPreflight() {
  return new Response(null, { status: 204, headers: CORS });
}

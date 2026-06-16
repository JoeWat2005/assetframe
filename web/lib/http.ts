import { SITE } from "@/site.config";

// Minimal branded HTML confirmation page (used by the subscribe-confirm / unsubscribe routes,
// which are hit directly from email links). Self-contained inline styles — no app shell.
export function htmlPage(title: string, body: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — ${SITE.brand}</title></head>` +
      `<body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f6f8;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;">` +
      `<div style="max-width:420px;background:#fff;border:1px solid #e6e8eb;border-radius:14px;padding:32px;text-align:center;">` +
      `<div style="font-weight:800;color:#0b2545;font-size:18px;">${SITE.brand}</div>` +
      `<h1 style="font-size:18px;color:#0b2545;margin:16px 0 8px;">${esc(title)}</h1>` +
      `<p style="font-size:14px;color:#57606a;margin:0 0 20px;">${esc(body)}</p>` +
      `<a href="${SITE.url}" style="display:inline-block;background:#0b2545;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;">Go to ${SITE.brand}</a>` +
      `</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

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

import "server-only";

// Tiny Upstash Redis (REST) helper for the engine WAKE-signal so the OCI poller doesn't have to keep
// Neon awake (free-tier compute-hours). Upstash now carries only the wake flag (+ the app's rate
// limiter); the engine's `online` is the box control server's own poller-liveness check, so there is
// no heartbeat here anymore. Reuses the same env the rate limiter reads — the Vercel↔Upstash
// integration provisions UPSTASH_KV_REST_API_*; we accept the canonical names too. Graceful: with no
// creds, everything no-ops (returns null) and callers fall back.

function creds(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_KV_REST_API_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function upstashConfigured(): boolean {
  return creds() !== null;
}

/** Run one Upstash REST command (e.g. ["SET","k","v"]); returns its `result`, or null on any
 *  error / when unconfigured. Never throws — a signalling blip must not break the caller. */
export async function upstashCommand(command: (string | number)[]): Promise<unknown> {
  const c = creds();
  if (!c) return null;
  try {
    const res = await fetch(c.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { result?: unknown };
    return j.result ?? null;
  } catch {
    return null;
  }
}

// Key shared with the engine (scripts/coordination/wake.py). UPSTASH_KEY_PREFIX namespaces a 2nd
// environment (e.g. "dev:") onto the SAME Upstash DB so dev + prod wake flags don't collide;
// unset = prod (no prefix). The engine's matching box must set the SAME prefix.
const KEY_PREFIX = process.env.UPSTASH_KEY_PREFIX ?? "";
const WAKE_KEY = `${KEY_PREFIX}af:engine:wake`;

/** Flag that a generation request is waiting, so the OCI poller picks it up on its next ~30s tick
 *  instead of waiting for its periodic Neon safety sweep. Best-effort (1h TTL safety net). */
export async function signalEngineWake(): Promise<void> {
  await upstashCommand(["SET", WAKE_KEY, "1", "EX", "3600"]);
}

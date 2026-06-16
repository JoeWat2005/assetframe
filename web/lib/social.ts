import "server-only";
import { sql } from "./db";

// Readers + token mutations for watchlists (per-user followed instruments) and the email
// subscriber list. All guarded so missing DB/tables degrade to empty/false, never throw.

export type Follow = { symbol: string; instrument: string; createdAt: string };

export async function getWatchlist(userId: string | null | undefined): Promise<Follow[]> {
  if (!sql || !userId) return [];
  try {
    const rows = (await sql.query(
      `SELECT symbol, coalesce(instrument, '') AS instrument, to_char(created_at, 'YYYY-MM-DD') AS created_at
         FROM watchlists WHERE clerk_user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )) as Record<string, unknown>[];
    return rows.map((r) => ({ symbol: String(r.symbol), instrument: String(r.instrument), createdAt: String(r.created_at) }));
  } catch {
    return [];
  }
}

export async function isFollowing(userId: string | null | undefined, symbol: string): Promise<boolean> {
  if (!sql || !userId) return false;
  try {
    const rows = (await sql.query(
      `SELECT 1 FROM watchlists WHERE clerk_user_id = $1 AND symbol = $2 LIMIT 1`,
      [userId, symbol]
    )) as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Double opt-in confirmation (clears the token so the link is single-use).
export async function confirmByToken(token: string): Promise<boolean> {
  if (!sql || !token) return false;
  try {
    const rows = (await sql.query(
      `UPDATE subscribers SET status = 'confirmed', confirmed_at = now(), confirm_token = NULL
         WHERE confirm_token = $1 AND status <> 'unsubscribed' RETURNING id`,
      [token]
    )) as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

// One-click unsubscribe (the token stays valid so repeat clicks are idempotent).
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!sql || !token) return false;
  try {
    const rows = (await sql.query(
      `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = now() WHERE unsub_token = $1 RETURNING id`,
      [token]
    )) as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

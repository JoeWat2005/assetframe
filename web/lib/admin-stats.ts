import "server-only";
import { unstable_cache } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "./db";
import { getCatalog } from "./content";

export type DayPoint = { date: string; count: number };

export type AdminStats = {
  members: number;
  subscribers: number;
  membersCapped: boolean; // true if we stopped scanning before counting everyone
  signups30d: DayPoint[];
  downloads30d: DayPoint[];
  downloadsTotal: number;
  topReports: { reportId: string; count: number }[];
  editionsByClass: { assetClass: string; count: number }[];
  recent: { id: string; email: string; subscribed: boolean }[];
};

// Last 30 calendar days (UTC), oldest → newest, as YYYY-MM-DD.
function last30Days(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

type Row = Record<string, unknown>;

type ClerkStats = Pick<AdminStats, "members" | "subscribers" | "membersCapped" | "signups30d" | "recent">;
type DataStats = Pick<AdminStats, "downloads30d" | "downloadsTotal" | "topReports" | "editionsByClass">;

// Clerk-derived member stats. Deliberately NOT wrapped in unstable_cache: clerkClient() can throw
// inside the cache's detached execution context (it resolves request/secret scope), and the old
// code swallowed that in a bare `catch {}` — which silently zeroed the "New members", "Free vs Pro"
// and "Recent members" charts even when Clerk had users. Fetched per request (one 100-user page,
// cheap) and any failure is LOGGED (visible in Vercel logs) rather than hidden.
async function getClerkStats(): Promise<ClerkStats> {
  const days = last30Days();
  const signupMap = new Map<string, number>(days.map((d) => [d, 0]));
  const recent: AdminStats["recent"] = [];
  let members = 0;
  let subscribers = 0;
  let membersCapped = false;

  try {
    const cc = await clerkClient();
    let page;
    try {
      // Newest first so "recent members" + the signup chart are right.
      page = await cc.users.getUserList({ limit: 100, orderBy: "-created_at" });
    } catch {
      // Some Clerk instances reject the orderBy param — fall back to an unordered page.
      page = await cc.users.getUserList({ limit: 100 });
    }
    members = typeof page.totalCount === "number" ? page.totalCount : page.data.length;
    membersCapped = members > page.data.length; // charts/recent/subscriber count cover the newest 100
    for (const u of page.data) {
      const created = new Date(Number(u.createdAt)).toISOString().slice(0, 10);
      if (signupMap.has(created)) signupMap.set(created, (signupMap.get(created) ?? 0) + 1);
      const sub = (u.publicMetadata as { subscribed?: boolean })?.subscribed === true;
      if (sub) subscribers++;
      if (recent.length < 12) {
        recent.push({ id: u.id, email: u.primaryEmailAddress?.emailAddress ?? u.id, subscribed: sub });
      }
    }
  } catch (err) {
    // Loud, not silent — so a misconfigured CLERK_SECRET_KEY or an SDK error is diagnosable.
    console.error("[admin-stats] Clerk member fetch failed:", err instanceof Error ? err.message : err);
  }

  return {
    members,
    subscribers,
    membersCapped,
    signups30d: days.map((d) => ({ date: d, count: signupMap.get(d) ?? 0 })),
    recent,
  };
}

// DB- + catalog-derived stats (downloads, top reports, editions-by-class). These are safe to cache
// (no Clerk/request scope), so a rapid admin reload doesn't re-query the download log each time.
async function _getDataStats(): Promise<DataStats> {
  const days = last30Days();
  const downloadMap = new Map<string, number>(days.map((d) => [d, 0]));
  let downloadsTotal = 0;
  let topReports: AdminStats["topReports"] = [];
  if (sql) {
    try {
      const rows = (await sql.query(
        `SELECT to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d, count(*)::int AS c
         FROM download_log WHERE ts >= now() - interval '30 days' GROUP BY 1`
      )) as Row[];
      for (const r of rows) {
        const d = String(r.d);
        if (downloadMap.has(d)) downloadMap.set(d, Number(r.c) || 0);
      }
      const tot = (await sql.query(`SELECT count(*)::int AS c FROM download_log`)) as Row[];
      downloadsTotal = Number(tot[0]?.c) || 0;
      const top = (await sql.query(
        `SELECT report_id, count(*)::int AS c FROM download_log GROUP BY 1 ORDER BY c DESC LIMIT 8`
      )) as Row[];
      topReports = top.map((r) => ({ reportId: String(r.report_id ?? ""), count: Number(r.c) || 0 }));
    } catch {
      /* download_log not migrated yet */
    }
  }

  const classMap = new Map<string, number>();
  try {
    for (const e of await getCatalog()) {
      const k = e.assetClass || "Other";
      classMap.set(k, (classMap.get(k) ?? 0) + 1);
    }
  } catch {
    /* ignore */
  }

  return {
    downloads30d: days.map((d) => ({ date: d, count: downloadMap.get(d) ?? 0 })),
    downloadsTotal,
    topReports,
    editionsByClass: [...classMap.entries()].map(([assetClass, count]) => ({ assetClass, count })),
  };
}

const getDataStats = unstable_cache(_getDataStats, ["admin-data-stats"], { revalidate: 120, tags: ["content"] });

// Combine the (uncached, loud-on-error) Clerk member stats with the cached DB/catalog stats.
export async function getAdminStats(): Promise<AdminStats> {
  const [clerk, data] = await Promise.all([getClerkStats(), getDataStats()]);
  return { ...data, ...clerk };
}

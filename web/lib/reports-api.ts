import "server-only";
import { getCatalog, getEdition, getEditionProKeys, getTrackRecord, type Edition, type TrackRecord } from "./content";
import { getObjectText, signedReportUrl } from "./r2";
import { SITE } from "@/site.config";

// Shared JSON-safe payload builders for the MCP server and the public REST API. Both reuse
// the same content/R2 layer the website uses, and every payload carries the standing
// disclaimer (this is research/decision-support, never advice).

const DISCLAIMER = SITE.disclaimer;
const BASE = SITE.url.replace(/\/$/, "");

export type ReportSummary = {
  id: string;
  date: string;
  slug: string;
  instrument: string;
  ticker: string;
  assetClass: string;
  status: string;
  risk: string;
  bias: string;
  confidence: number | null;
  windowEnd: string;
  hasPro: boolean;
  url: string;
};

function toSummary(e: Edition): ReportSummary {
  return {
    id: `${e.date}/${e.slug}`,
    date: e.date,
    slug: e.slug,
    instrument: e.instrument,
    ticker: e.ticker,
    assetClass: e.assetClass,
    status: e.status,
    risk: e.risk,
    bias: e.bias,
    confidence: e.confidence ?? null,
    windowEnd: e.windowEnd,
    hasPro: e.hasPro,
    url: `${BASE}/reports/${e.date}/${e.slug}`,
  };
}

export type ListFilters = {
  assetClass?: string;
  status?: string;
  date?: string;
  query?: string;
  limit?: number;
};

export async function listReports(f: ListFilters = {}) {
  let items = await getCatalog();
  if (f.assetClass) {
    const a = f.assetClass.toLowerCase();
    items = items.filter((e) => e.assetClass.toLowerCase() === a);
  }
  if (f.status) {
    const s = f.status.toLowerCase();
    items = items.filter((e) => e.status.toLowerCase() === s);
  }
  if (f.date) items = items.filter((e) => e.date === f.date);
  if (f.query) {
    const q = f.query.toLowerCase();
    items = items.filter((e) => `${e.instrument} ${e.ticker} ${e.slug}`.toLowerCase().includes(q));
  }
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 200);
  return {
    total: items.length,
    returned: Math.min(items.length, limit),
    reports: items.slice(0, limit).map(toSummary),
    disclaimer: DISCLAIMER,
  };
}

// Crude HTML→text for returning Snapshot content to an agent (the Snapshot HTML twin is one
// page; this keeps it readable without pulling in a parser).
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getReportDetail(date: string, slug: string) {
  const e = await getEdition(date, slug);
  if (!e) return null;
  let snapshotText = "";
  if (e.freeHtml) {
    const html = await getObjectText(e.freeHtml);
    if (html) snapshotText = htmlToText(html);
  }
  const snapshotPdfUrl = e.freePdf ? await signedReportUrl(e.freePdf, 600) : null;
  return {
    ...toSummary(e),
    snapshotText,
    snapshotPdfUrl,
    proAvailable: e.hasPro,
    proAccess: e.hasPro ? `Subscribe at ${BASE}/pricing to unlock the full Pro analysis.` : null,
    disclaimer: DISCLAIMER,
  };
}

// Gated Pro detail — only call after confirming the caller is an entitled subscriber.
export async function getProReportDetail(date: string, slug: string) {
  const e = await getEdition(date, slug);
  if (!e || !e.hasPro) return null;
  const keys = await getEditionProKeys(date, slug);
  let proText = "";
  if (keys?.proHtml) {
    const html = await getObjectText(keys.proHtml);
    if (html) proText = htmlToText(html);
  }
  const proPdfUrl = keys?.proPdf ? await signedReportUrl(keys.proPdf, 600) : null;
  return { ...toSummary(e), proText, proPdfUrl, disclaimer: DISCLAIMER };
}

export async function getTrackRecordPayload() {
  const tr: TrackRecord = await getTrackRecord();
  return { ...tr, disclaimer: DISCLAIMER };
}

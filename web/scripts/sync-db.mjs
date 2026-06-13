// Sync the generated content (web/content/*.json) into Neon Postgres.
// Run after `python scripts/export_content.py`:  node scripts/sync-db.mjs
// Applies the schema (idempotent), upserts editions, and replaces the
// track-record snapshot (open calls + scored results).
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url)); // web/scripts
const web = path.join(here, "..");                         // web

// Load DATABASE_URL from web/.env.local if it isn't already in the environment.
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  try {
    for (const line of readFileSync(path.join(web, ".env.local"), "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
    }
  } catch { /* no .env.local */ }
}

const url =
  process.env.DATABASE_URL || process.env.POSTGRES_URL ||
  process.env.STORAGE_DATABASE_URL || process.env.STORAGE_URL;
if (!url) {
  console.error("No DATABASE_URL — set it in web/.env.local or the environment.");
  process.exit(1);
}
const sql = neon(url);
const readJson = (f) => JSON.parse(readFileSync(path.join(web, "content", f), "utf-8"));
const toInt = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : parseInt(v, 10));

// Schema is owned by node-pg-migrate (web/migrations). Run `npm run migrate:up`
// first, or `npm run db:setup` to migrate then sync. This script only syncs DATA.

// 1. editions (upsert)
const catalog = readJson("catalog.json");
for (const e of catalog) {
  const id = `${e.date}/${e.slug}`;
  await sql.query(
    `INSERT INTO editions (id, report_date, slug, instrument, ticker, asset_class, status, risk, bias,
       data_quality, window_end, catalyst_status, has_pro, free_html_key, free_pdf_key, preview_key,
       pro_html_key, pro_pdf_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id) DO UPDATE SET
       report_date=excluded.report_date, slug=excluded.slug, instrument=excluded.instrument,
       ticker=excluded.ticker, asset_class=excluded.asset_class, status=excluded.status,
       risk=excluded.risk, bias=excluded.bias, data_quality=excluded.data_quality,
       window_end=excluded.window_end, catalyst_status=excluded.catalyst_status, has_pro=excluded.has_pro,
       free_html_key=excluded.free_html_key, free_pdf_key=excluded.free_pdf_key,
       preview_key=excluded.preview_key, pro_html_key=excluded.pro_html_key, pro_pdf_key=excluded.pro_pdf_key`,
    [id, e.date, e.slug, e.instrument, e.ticker, e.assetClass, e.status, e.risk, e.bias,
     toInt(e.dataQuality), e.windowEnd, e.catalystStatus, !!e.hasPro, e.freeHtml, e.freePdf, e.preview,
     e.hasPro ? `${e.date}/${e.slug}/pro.html` : null, e.hasPro ? `${e.date}/${e.slug}/pro.pdf` : null]
  );
}
console.log(`editions: ${catalog.length}`);

// 2. track record (snapshot — replace open_calls + predictions + scored_results)
const track = readJson("track-record.json");
await sql.query("DELETE FROM open_calls"); // cascades to open_call_predictions
let predCount = 0;
for (const c of track.open || []) {
  await sql.query(
    `INSERT INTO open_calls (report_id, instrument, symbol, view, confidence, window_end, n, n_manual)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [c.reportId, c.instrument, c.symbol, c.view, String(c.confidence), c.windowEnd, c.n || 0, c.nManual || 0]
  );
  const preds = c.predictions || [];
  for (let i = 0; i < preds.length; i++) {
    const p = preds[i];
    await sql.query(
      `INSERT INTO open_call_predictions (report_id, seq, pred_id, type, text, manual, expect)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (report_id, pred_id) DO UPDATE SET
         seq=excluded.seq, type=excluded.type, text=excluded.text,
         manual=excluded.manual, expect=excluded.expect`,
      [c.reportId, i + 1, p.id || `P${i + 1}`, p.type || "", p.text || "",
       !!p.manual, typeof p.expect === "boolean" ? p.expect : null]
    );
    predCount++;
  }
}
await sql.query("DELETE FROM scored_results");
for (const r of track.scored || []) {
  await sql.query(
    `INSERT INTO scored_results (report_id, instrument, view, confidence, results, hits, misses, hit_rate, window_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [r.reportId || null, r.instrument, r.view, String(r.confidence), r.results,
     toInt(r.hits), toInt(r.misses), String(r.hitRate), r.windowEnd]
  );
}
console.log(`open_calls: ${(track.open || []).length} (${predCount} predictions), scored_results: ${(track.scored || []).length}`);
console.log("done — synced to Neon");

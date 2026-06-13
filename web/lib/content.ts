import "server-only";
import fs from "node:fs";
import path from "node:path";
import { sql } from "./db";

export type Edition = {
  date: string; slug: string; instrument: string; ticker: string;
  assetClass: string; status: string; risk: string; bias: string;
  lastPrice: string; dataQuality: string | number; windowEnd: string;
  reportDate: string; catalystStatus: string;
  freeHtml: string; freePdf: string; preview: string; hasPro: boolean;
};

export type SubCall = {
  id: string; type: string; text: string; manual: boolean; expect?: boolean | null;
};
export type OpenCall = {
  reportId: string; instrument: string; symbol: string; view: string;
  confidence: string | number; windowEnd: string; n: number; nManual: number;
  predictions: SubCall[];
};
export type ScoredRow = {
  instrument: string; view: string; confidence: string | number;
  results: string; hitRate: string | number; windowEnd: string;
};
export type TrackRecord = {
  stats: { reportsScored: number; openCalls: number; predictionsGraded: number; hitRate: number | null };
  open: OpenCall[]; scored: ScoredRow[];
  calibration: Record<string, { hitRate: number | null; n: number }> | null;
};

// ------------------------------------------------------------------ JSON fallback
const CONTENT = path.join(process.cwd(), "content");
function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(CONTENT, file), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

// ------------------------------------------------------------------ row mappers
type Row = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? "" : String(v));

function rowToEdition(r: Row): Edition {
  const date = s(r.report_date).slice(0, 10);
  return {
    date, slug: s(r.slug), instrument: s(r.instrument), ticker: s(r.ticker),
    assetClass: s(r.asset_class), status: s(r.status), risk: s(r.risk), bias: s(r.bias),
    lastPrice: "", dataQuality: r.data_quality == null ? "" : Number(r.data_quality),
    windowEnd: s(r.window_end), reportDate: date, catalystStatus: s(r.catalyst_status),
    freeHtml: s(r.free_html_key), freePdf: s(r.free_pdf_key), preview: s(r.preview_key),
    hasPro: Boolean(r.has_pro),
  };
}

const EDITION_COLS = `id, report_date::text AS report_date, slug, instrument, ticker,
  asset_class, status, risk, bias, data_quality, window_end, catalyst_status, has_pro,
  free_html_key, free_pdf_key, preview_key`;

// ------------------------------------------------------------------ public API (DB-first)
export async function getCatalog(): Promise<Edition[]> {
  if (sql) {
    try {
      const rows = await sql.query(
        `SELECT ${EDITION_COLS} FROM editions ORDER BY report_date DESC, slug DESC`
      );
      return (rows as Row[]).map(rowToEdition);
    } catch {
      /* fall through to JSON */
    }
  }
  return readJson<Edition[]>("catalog.json", []);
}

export async function getEdition(date: string, slug: string): Promise<Edition | undefined> {
  if (sql) {
    try {
      const rows = await sql.query(
        `SELECT ${EDITION_COLS} FROM editions WHERE id = $1 LIMIT 1`,
        [`${date}/${slug}`]
      );
      const r = (rows as Row[])[0];
      if (r) return rowToEdition(r);
    } catch {
      /* fall through */
    }
  }
  return (await getCatalog()).find((e) => e.date === date && e.slug === slug);
}

export async function getTrackRecord(): Promise<TrackRecord> {
  if (sql) {
    try {
      const openRows = (await sql.query(
        `SELECT report_id, instrument, symbol, view, confidence, window_end, n, n_manual, predictions
         FROM open_calls ORDER BY window_end`
      )) as Row[];
      const scoredRows = (await sql.query(
        `SELECT instrument, view, confidence, results, hits, misses, hit_rate, window_end
         FROM scored_results ORDER BY scored_at`
      )) as Row[];

      const open: OpenCall[] = openRows.map((r) => ({
        reportId: s(r.report_id), instrument: s(r.instrument), symbol: s(r.symbol),
        view: s(r.view), confidence: s(r.confidence), windowEnd: s(r.window_end),
        n: Number(r.n) || 0, nManual: Number(r.n_manual) || 0,
        predictions: Array.isArray(r.predictions) ? (r.predictions as SubCall[]) : [],
      }));
      const scored: ScoredRow[] = scoredRows.map((r) => ({
        instrument: s(r.instrument), view: s(r.view), confidence: s(r.confidence),
        results: s(r.results), hitRate: s(r.hit_rate), windowEnd: s(r.window_end),
      }));
      const hits = scoredRows.reduce((a, r) => a + (Number(r.hits) || 0), 0);
      const misses = scoredRows.reduce((a, r) => a + (Number(r.misses) || 0), 0);
      const graded = hits + misses;
      return {
        stats: {
          reportsScored: scored.length, openCalls: open.length, predictionsGraded: graded,
          hitRate: graded ? Math.round((1000 * hits) / graded) / 10 : null,
        },
        open, scored, calibration: computeCalibration(scoredRows),
      };
    } catch {
      /* fall through */
    }
  }
  return readJson<TrackRecord>("track-record.json", {
    stats: { reportsScored: 0, openCalls: 0, predictionsGraded: 0, hitRate: null },
    open: [], scored: [], calibration: null,
  });
}

function computeCalibration(rows: Row[]): TrackRecord["calibration"] {
  if (rows.length < 10) return null;
  const buckets: Record<string, number[]> = { "<=60": [], "61-75": [], ">75": [] };
  for (const r of rows) {
    const c = Number(r.confidence), hr = Number(r.hit_rate);
    if (Number.isNaN(c) || Number.isNaN(hr)) continue;
    (c <= 60 ? buckets["<=60"] : c <= 75 ? buckets["61-75"] : buckets[">75"]).push(hr);
  }
  const out: Record<string, { hitRate: number | null; n: number }> = {};
  for (const [k, v] of Object.entries(buckets)) {
    out[k] = { hitRate: v.length ? Math.round((10 * v.reduce((a, b) => a + b, 0)) / v.length) / 10 : null, n: v.length };
  }
  return out;
}

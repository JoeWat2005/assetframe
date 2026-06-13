import "server-only";
import fs from "node:fs";
import path from "node:path";

export type Edition = {
  date: string; slug: string; instrument: string; ticker: string;
  assetClass: string; status: string; risk: string; bias: string;
  lastPrice: string; dataQuality: string | number; windowEnd: string;
  reportDate: string; catalystStatus: string;
  freeHtml: string; freePdf: string; preview: string; hasPro: boolean;
};

export type OpenCall = {
  reportId: string; instrument: string; symbol: string; view: string;
  confidence: string | number; windowEnd: string; n: number; nManual: number;
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

const CONTENT = path.join(process.cwd(), "content");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(CONTENT, file), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function getCatalog(): Edition[] {
  return readJson<Edition[]>("catalog.json", []);
}

export function getEdition(date: string, slug: string): Edition | undefined {
  return getCatalog().find((e) => e.date === date && e.slug === slug);
}

export function getTrackRecord(): TrackRecord {
  return readJson<TrackRecord>("track-record.json", {
    stats: { reportsScored: 0, openCalls: 0, predictionsGraded: 0, hitRate: null },
    open: [], scored: [], calibration: null,
  });
}

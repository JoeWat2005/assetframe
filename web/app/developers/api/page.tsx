import type { Metadata } from "next";
import { Hero } from "@/components/ui";
import CodeBlock from "../CodeBlock";
import { SITE } from "@/site.config";

export const metadata: Metadata = {
  title: "REST API",
  description: "A simple read-only JSON API for the AssetFrame report catalog, Snapshots and track record.",
  alternates: { canonical: "/developers/api" },
};

const BASE = SITE.url.replace(/\/$/, "");
const API = `${BASE}/api/v1`;

const exampleResponse = `{
  "total": 21,
  "returned": 5,
  "reports": [
    {
      "id": "2026-06-15/BTC",
      "date": "2026-06-15",
      "instrument": "Bitcoin",
      "ticker": "BTC",
      "assetClass": "crypto",
      "status": "Wait",
      "risk": "High",
      "confidence": 60,
      "url": "${BASE}/reports/2026-06-15/BTC"
    }
  ],
  "disclaimer": "AssetFrame publishes general market research ..."
}`;

export default function ApiDocsPage() {
  return (
    <>
      <Hero title="REST API" tag="A simple read-only JSON API for the report catalog, Snapshots and the track record." />
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-muted-foreground">
          Read-only JSON over HTTPS. No key required for the free tier, and responses include CORS headers so you
          can call it from the browser. Every payload carries the research disclaimer.
        </p>

        <h2 className="mt-8 text-xl font-bold text-navy">Base URL</h2>
        <CodeBlock code={API} />

        <h2 className="mt-8 text-xl font-bold text-navy">Endpoints</h2>

        <h3 className="mt-5 font-mono text-sm font-semibold text-navy">GET /reports</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          List published editions. Query params: <code>asset_class</code>, <code>status</code>, <code>date</code> (YYYY-MM-DD), <code>q</code> (search), <code>limit</code> (1–200).
        </p>
        <CodeBlock code={`curl "${API}/reports?asset_class=crypto&limit=5"`} />

        <h3 className="mt-6 font-mono text-sm font-semibold text-navy">GET /reports/{`{date}`}/{`{slug}`}</h3>
        <p className="mt-1 text-sm text-muted-foreground">One report: Snapshot metadata, Snapshot text and a short-lived PDF link.</p>
        <CodeBlock code={`curl "${API}/reports/2026-06-15/BTC"`} />

        <h3 className="mt-6 font-mono text-sm font-semibold text-navy">GET /track-record</h3>
        <p className="mt-1 text-sm text-muted-foreground">Scored predictions, hit rate, streaks and calibration.</p>
        <CodeBlock code={`curl "${API}/track-record"`} />

        <h2 className="mt-8 text-xl font-bold text-navy">Example response</h2>
        <CodeBlock code={exampleResponse} />

        <div className="mt-8 rounded-xl border border-[#cdd9ea] bg-tile px-4 py-3 text-sm text-[#33415c]">
          Responses are cached briefly at the edge. This is research data — not a trading or execution API.
        </div>
        <p className="mt-6 text-xs text-muted-foreground">{SITE.disclaimer}</p>
      </div>
    </>
  );
}

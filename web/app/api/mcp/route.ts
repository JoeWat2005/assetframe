import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { listReports, getReportDetail, getTrackRecordPayload } from "@/lib/reports-api";

// AssetFrame MCP server (Streamable HTTP) at /api/mcp. Free, read-only tools — anyone can
// connect and read the published Snapshot research + track record. Pro report content is
// gated behind subscription on the website (a Pro tool is added under OAuth separately).
export const maxDuration = 60;

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_reports",
      {
        title: "List AssetFrame reports",
        description:
          "List published AssetFrame report editions (free Snapshot metadata: instrument, directional status, risk, confidence, window). Optionally filter by asset class, status, or date.",
        inputSchema: {
          asset_class: z.string().optional().describe("e.g. 'equity', 'fx', 'crypto', 'commodity', 'index'"),
          status: z.string().optional().describe("directional status, e.g. 'Buy', 'Sell', 'Wait'"),
          date: z.string().optional().describe("ISO date YYYY-MM-DD"),
          limit: z.number().int().min(1).max(200).optional().describe("max rows (default 50)"),
        },
      },
      async ({ asset_class, status, date, limit }) =>
        json(await listReports({ assetClass: asset_class, status, date, limit }))
    );

    server.registerTool(
      "search_reports",
      {
        title: "Search reports",
        description: "Search published reports by instrument name or ticker (e.g. 'BTC', 'gold', 'Apple').",
        inputSchema: {
          query: z.string().min(1).describe("instrument name or ticker"),
          limit: z.number().int().min(1).max(200).optional(),
        },
      },
      async ({ query, limit }) => json(await listReports({ query, limit }))
    );

    server.registerTool(
      "get_report",
      {
        title: "Get a report",
        description:
          "Get one report's free Snapshot: metadata, the Snapshot text, and a short-lived PDF link. The full Pro analysis requires a subscription on assetframe.co.uk.",
        inputSchema: {
          date: z.string().describe("ISO date YYYY-MM-DD"),
          slug: z.string().describe("instrument slug, e.g. 'AAPL' or 'BTC'"),
        },
      },
      async ({ date, slug }) => {
        const r = await getReportDetail(date, slug);
        return r
          ? json(r)
          : { content: [{ type: "text" as const, text: "No published report found for that date/slug." }], isError: true };
      }
    );

    server.registerTool(
      "get_track_record",
      {
        title: "Get track record",
        description:
          "AssetFrame's public track record: number of scored predictions, hit rate, current/longest streak, and per-confidence calibration.",
        inputSchema: {},
      },
      async () => json(await getTrackRecordPayload())
    );
  },
  { serverInfo: { name: "assetframe", version: "1.0.0" } },
  { basePath: "/api", disableSse: true, verboseLogs: false }
);

export { handler as GET, handler as POST, handler as DELETE };

import type { Metadata } from "next";
import { Hero } from "@/components/ui";
import CodeBlock from "../CodeBlock";
import { SITE } from "@/site.config";

export const metadata: Metadata = {
  title: "MCP server",
  description: "Connect Claude, Cursor and other MCP clients to AssetFrame research. Free read-only tools over Streamable HTTP.",
  alternates: { canonical: "/developers/mcp" },
};

const BASE = SITE.url.replace(/\/$/, "");
const MCP_URL = `${BASE}/api/mcp`;

const TOOLS: [string, string][] = [
  ["list_reports", "List published editions; filter by asset class, status or date."],
  ["search_reports", "Search editions by instrument name or ticker."],
  ["get_report", "One report: Snapshot metadata, Snapshot text, and a short-lived PDF link."],
  ["get_track_record", "Scored predictions, hit rate, streaks and per-confidence calibration."],
];

const cliCmd = `claude mcp add --transport http assetframe ${MCP_URL}`;
const desktopJson = `{
  "mcpServers": {
    "assetframe": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;
const remoteJson = `{
  "mcpServers": {
    "assetframe": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${MCP_URL}"]
    }
  }
}`;

export default function McpDocsPage() {
  return (
    <>
      <Hero title="MCP server" tag="Connect Claude, Cursor and other agents to AssetFrame research over the Model Context Protocol." />
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-muted-foreground">
          The Model Context Protocol (MCP) lets AI clients call tools on a server. AssetFrame runs a hosted MCP
          server over Streamable HTTP, so any MCP-capable client can read the published research. The free tools
          below need no authentication.
        </p>

        <h2 className="mt-8 text-xl font-bold text-navy">Endpoint</h2>
        <CodeBlock code={MCP_URL} />

        <h2 className="mt-8 text-xl font-bold text-navy">Connect</h2>
        <p className="mt-3 text-sm text-muted-foreground">Claude Code (CLI):</p>
        <CodeBlock code={cliCmd} />
        <p className="mt-4 text-sm text-muted-foreground">Claude Desktop or Cursor — add to your MCP config:</p>
        <CodeBlock code={desktopJson} />
        <p className="mt-4 text-sm text-muted-foreground">Clients without native HTTP transport (via mcp-remote):</p>
        <CodeBlock code={remoteJson} />

        <h2 className="mt-8 text-xl font-bold text-navy">Tools</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full overflow-hidden rounded-xl border border-line text-sm">
            <thead className="bg-tile text-navy">
              <tr><th className="p-3 text-left">Tool</th><th className="p-3 text-left">What it returns</th></tr>
            </thead>
            <tbody>
              {TOOLS.map(([name, desc]) => (
                <tr key={name} className="border-t border-line">
                  <td className="whitespace-nowrap p-3 font-mono text-[13px] font-semibold text-navy">{name}</td>
                  <td className="p-3 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 text-xl font-bold text-navy">Pro access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The free tools return the Snapshot tier. Programmatic access to the full Pro analysis — for AssetFrame
          subscribers, by signing in through your client&rsquo;s OAuth flow — is rolling out. Free tools never
          require sign-in.
        </p>

        <div className="mt-8 rounded-xl border border-[#cdd9ea] bg-tile px-4 py-3 text-sm text-[#33415c]">{SITE.disclaimer}</div>
      </div>
    </>
  );
}

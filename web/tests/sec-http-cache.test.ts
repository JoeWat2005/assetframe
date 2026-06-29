import { describe, it, expect } from "vitest";
import { apiJson, apiJsonPrivate } from "@/lib/http";

describe("REST /api/v1 cache posture", () => {
  it("public free data (catalog/track-record) stays CDN-cacheable", () => {
    const cc = apiJson({ ok: true }).headers.get("Cache-Control") || "";
    expect(cc).toContain("public");
    expect(cc).toContain("s-maxage");
  });

  it("gated/per-API-key data is NEVER CDN-cacheable (no paid-content leak)", () => {
    const cc = apiJsonPrivate({ pro: "secret" }).headers.get("Cache-Control");
    expect(cc).toBe("private, no-store");
    expect(cc).not.toContain("public");
  });

  it("both still permit cross-origin API-key GETs (auth is Bearer, not cookies)", () => {
    expect(apiJsonPrivate({}).headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

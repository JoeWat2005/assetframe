import type { MetadataRoute } from "next";
import { SITE } from "@/site.config";

// Allow every crawler — including AI search bots (GPTBot, ClaudeBot, PerplexityBot,
// Google-Extended, Bingbot, etc., all covered by "*") so AssetFrame can be cited in
// AI answers / AI Overviews — while keeping private and auth surfaces out of the index.
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api/", "/sign-in", "/sign-up"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

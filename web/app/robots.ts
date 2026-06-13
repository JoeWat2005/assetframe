import type { MetadataRoute } from "next";
import { SITE } from "@/site.config";

export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api"] },
    sitemap: `${base}/sitemap.xml`,
  };
}

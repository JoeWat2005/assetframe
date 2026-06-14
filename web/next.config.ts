import type { NextConfig } from "next";

// Content-Security-Policy. Shipped as Report-Only so it cannot break Clerk / Google
// Analytics / Lemon Squeezy checkout at launch. Watch the browser console for CSP
// violations across sign-in, checkout, report-download and analytics, confirm the
// allow-lists (esp. your production Clerk domain), then ENFORCE by renaming the header
// key below to "Content-Security-Policy". Hardened follow-up: drop 'unsafe-inline' in
// favour of a per-request nonce.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.assetframe.co.uk https://challenges.cloudflare.com https://www.googletagmanager.com https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com https://www.googletagmanager.com https://www.google-analytics.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.assetframe.co.uk https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://vitals.vercel-insights.com https://*.vercel-scripts.com",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://*.lemonsqueezy.com https://*.clerk.accounts.dev https://*.clerk.com",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Baseline security headers applied to every response.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

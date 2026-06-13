"use client";
import Script from "next/script";

// Loads Lemon.js once so checkout opens as an in-page overlay (embed) instead of
// redirecting. Buy buttons carry the `lemonsqueezy-button` class + ?embed=1.
export default function LemonScript() {
  return (
    <Script
      src="https://assets.lemonsqueezy.com/lemon.js"
      strategy="afterInteractive"
      onLoad={() => {
        (window as unknown as { createLemonSqueezy?: () => void }).createLemonSqueezy?.();
      }}
    />
  );
}

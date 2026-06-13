"use client";
import { useEffect } from "react";
import { SITE } from "@/site.config";

// Opens the Lemon Squeezy checkout as an embedded overlay. Degrades gracefully to
// the hosted checkout if Lemon.js hasn't loaded. Re-inits on mount so it works
// after client-side navigation.
export default function BuyButton({
  children,
  className = "",
  full = false,
}: {
  children: React.ReactNode;
  className?: string;
  full?: boolean;
}) {
  useEffect(() => {
    (window as unknown as { createLemonSqueezy?: () => void }).createLemonSqueezy?.();
  }, []);

  const base = SITE.checkoutUrl;
  if (!base) return null;

  let href = base;
  try {
    const u = new URL(base);
    u.searchParams.set("embed", "1");
    href = u.toString();
  } catch {
    /* keep base */
  }

  return (
    <a
      href={href}
      className={`lemonsqueezy-button inline-flex items-center justify-center rounded-lg bg-[#9a6700] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 ${
        full ? "w-full" : ""
      } ${className}`}
    >
      {children}
    </a>
  );
}

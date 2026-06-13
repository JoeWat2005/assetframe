"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
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
  const { user } = useUser();

  useEffect(() => {
    (window as unknown as { createLemonSqueezy?: () => void }).createLemonSqueezy?.();
  }, []);

  // Don't let an already-subscribed user start a second checkout (double-billing).
  const subscribed = (user?.publicMetadata as { subscribed?: boolean } | undefined)?.subscribed === true;
  if (subscribed) {
    return (
      <a
        href="/account/subscription"
        className={`inline-flex items-center justify-center rounded-lg border border-[#9a6700] bg-[#fff7e6] px-4 py-2.5 text-sm font-bold text-[#9a6700] transition hover:opacity-90 ${
          full ? "w-full" : ""
        } ${className}`}
      >
        You&apos;re on Pro — manage subscription
      </a>
    );
  }

  const base = SITE.checkoutUrl;
  if (!base) return null;

  let href = base;
  try {
    const u = new URL(base);
    u.searchParams.set("embed", "1");
    // Pass the Clerk user id so the webhook can grant Pro to exactly this account
    // (not every account that happens to share the payer's email).
    if (user?.id) u.searchParams.set("checkout[custom][user_id]", user.id);
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

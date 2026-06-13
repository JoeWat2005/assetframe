"use client";
import { useUser } from "@clerk/nextjs";
import { SITE } from "@/site.config";

// Full-page hosted Lemon Squeezy checkout (no embedded overlay), so the
// post-purchase redirect fires reliably and we don't load Lemon.js on every page.
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
    // Pass the Clerk user id so the webhook grants Pro to exactly this account.
    if (user?.id) u.searchParams.set("checkout[custom][user_id]", user.id);
    href = u.toString();
  } catch {
    /* keep base */
  }

  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-lg bg-[#9a6700] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 ${
        full ? "w-full" : ""
      } ${className}`}
    >
      {children}
    </a>
  );
}

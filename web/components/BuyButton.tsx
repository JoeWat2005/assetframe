"use client";
import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { getCheckoutUrl } from "@/lib/checkout-actions";

// Subscribe button with three states:
//  - already subscribed  -> manage subscription (no double-billing)
//  - not signed in        -> sign up first (checkout MUST be bound to an account)
//  - signed in            -> server-built checkout URL with a signed token binding it to
//                            this account (so the payment is credited correctly regardless
//                            of the email entered at checkout).
export default function BuyButton({
  children,
  className = "",
  full = false,
  admin = false,
}: {
  children: React.ReactNode;
  className?: string;
  full?: boolean;
  admin?: boolean;
}) {
  const { user, isSignedIn, isLoaded } = useUser();
  const [pending, start] = useTransition();
  const [adminBlocked, setAdminBlocked] = useState(false);
  const gold = `inline-flex items-center justify-center rounded-lg bg-[#9a6700] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60 ${
    full ? "w-full" : ""
  } ${className}`;
  const calm = `inline-flex items-center justify-center rounded-lg border border-[#9a6700] bg-[#fff7e6] px-4 py-2.5 text-sm font-bold text-[#9a6700] transition hover:opacity-90 ${
    full ? "w-full" : ""
  } ${className}`;

  const meta = user?.publicMetadata as { subscribed?: boolean; role?: string; adminTier?: string } | undefined;
  const subscribed = meta?.subscribed === true;
  // Admin signal: the server-passed `admin` prop is authoritative; client-side we also treat a
  // Clerk "admin" role or the presence of `adminTier` (only ever set on admins) as admin, so
  // email-allowlist admins are caught even without the prop. getCheckoutUrl is the final
  // backstop (sets adminBlocked on click).
  const isAdmin = admin || meta?.role === "admin" || meta?.adminTier !== undefined;

  // Admins are comped and fully decoupled from billing — NEVER a checkout and never a billing
  // "manage" link, regardless of any stale paid flag. Their tier is the Free/Pro toggle on the
  // admin dashboard. Checked before the subscribed branch so a free-preview admin never sees
  // "You're on Pro".
  if (isAdmin || adminBlocked) {
    return (
      <a href="/admin" className={calm}>
        Admin access — set your view on the dashboard
      </a>
    );
  }

  if (subscribed) {
    return (
      <a href="/account/subscription" className={calm}>
        You&apos;re on Pro — manage subscription
      </a>
    );
  }

  // Require an account before checkout so the payment can be bound to it. Send them to
  // sign-up (which links to sign-in), returning to pricing to subscribe.
  if (isLoaded && !isSignedIn) {
    return (
      <a href="/sign-up?redirect_url=%2Fpricing" className={gold}>
        {children}
      </a>
    );
  }

  const go = () =>
    start(async () => {
      try {
        const { url, reason } = await getCheckoutUrl();
        if (reason === "admin") { setAdminBlocked(true); return; } // comped — show the admin note
        if (url) window.location.href = url;
      } catch {
        /* leave the button as-is; the user can retry */
      }
    });

  return (
    <button type="button" onClick={go} disabled={pending || !isLoaded} className={gold}>
      {pending ? "Loading…" : children}
    </button>
  );
}

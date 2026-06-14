"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Auth pages are full-screen with no marketing nav/footer (the standard). Everything
// else gets the normal header + footer. Header/Footer are passed in as already-rendered
// nodes so they stay server components.
export default function AppFrame({
  header, footer, children,
}: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const bare = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (bare) return <main className="flex-1">{children}</main>;

  // The header is fixed, so every page reserves its height (pt-14) to keep content clear
  // of it. This is deterministic — no client-only pathname branch — so statically-rendered
  // pages never flash a reserved gap (or a stray navbar bar) before hydration. The home
  // page cancels this with a `-mt-14` on its hero, so the hero sits full-bleed under the
  // (initially hidden) header that only reveals once you scroll past the fold.
  return (
    <>
      {header}
      <main className="flex-1 pt-14">{children}</main>
      {footer}
    </>
  );
}

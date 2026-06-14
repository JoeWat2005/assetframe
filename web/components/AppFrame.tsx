"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Auth pages are full-screen with no marketing nav/footer (the standard). Everything
// else gets the normal header + footer. Header/Footer are passed in as already-rendered
// nodes so they stay server components.
export default function AppFrame({
  header, footer, children,
}: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const bare = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isHome = pathname === "/";

  if (bare) return <main className="flex-1">{children}</main>;

  // The header is fixed. On the home page it starts hidden over the full-screen hero
  // and reveals on scroll, so the page sits under it. Every other page shows the header
  // at the top, so reserve its height (h-14) to keep content clear of it.
  return (
    <>
      {header}
      <main className={cn("flex-1", !isHome && "pt-14")}>{children}</main>
      {footer}
    </>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

// Internal link that smooth-scrolls the page to the top before navigating, so
// footer links (Terms, Privacy, …) glide up instead of jumping. Modifier-clicks
// (cmd/ctrl/shift/alt, middle button) fall through to normal browser behaviour.
export default function SmoothLink({
  href, className, children,
}: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (typeof window !== "undefined" && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => router.push(href), 380);
    } else {
      router.push(href);
    }
  };

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

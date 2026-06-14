"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Global: when an internal link (navbar, footer, anywhere) is clicked while the page is
// scrolled down, glide smoothly to the top first, then navigate — so every navigation
// eases up instead of jumping. Navigation fires on `scrollend` (with a timeout fallback)
// so the route changes exactly when the scroll finishes. External links, new-tab,
// downloads, hashes, modifier clicks, and links inside an open menu/sheet pass through.
export default function SmoothNav() {
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || a.getAttribute("target") === "_blank" || a.hasAttribute("download")) return;
      if (a.closest('[role="dialog"]')) return; // inside an open menu/sheet: navigate normally (don't hijack)
      if (window.scrollY <= 0) return; // already at top: let Next navigate normally

      e.preventDefault();
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        window.removeEventListener("scrollend", go);
        router.push(href);
      };
      window.addEventListener("scrollend", go, { once: true });
      window.setTimeout(go, 700); // fallback if scrollend is unsupported or never fires
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return null;
}

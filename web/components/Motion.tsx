"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Isolated GSAP motion layer (no Framer in this tree). Reveals elements tagged
// data-animate="hero" (load-in, staggered) and data-animate="up" (scroll reveal).
// Pre-hide is done in CSS scoped to html.gsap-on (set before paint by an inline
// script in layout) so there's no flash; if GSAP fails or motion is reduced we
// drop the class and everything is simply visible.
export default function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.classList.remove("gsap-on");
      return;
    }

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          gsap.utils.toArray<HTMLElement>('[data-animate="hero"]').forEach((el) => {
            const kids = el.children;
            gsap.set(kids, { y: 16, opacity: 0 });
            gsap.to(kids, {
              y: 0, opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.08, delay: 0.05,
            });
          });

          const ups = gsap.utils.toArray<HTMLElement>('[data-animate="up"]');
          gsap.set(ups, { y: 22, opacity: 0 });
          ScrollTrigger.batch(ups, {
            start: "top 88%",
            onEnter: (els) =>
              gsap.to(els, {
                y: 0, opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.08, overwrite: true,
              }),
          });
          ScrollTrigger.refresh();
        });
      } catch {
        root.classList.remove("gsap-on"); // never leave content stuck hidden
      }
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [pathname]);

  return null;
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Animated auto-redirect for the 404 page: a GSAP-driven progress bar drains over
// `seconds`, then routes to `to`. A JS safety timer guarantees the redirect even if
// GSAP fails to load, and reduced-motion users get the countdown without the animation.
export default function RedirectCountdown({ seconds = 5, to = "/" }: { seconds?: number; to?: string }) {
  const router = useRouter();
  const barRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    let cancelled = false;
    let done = false;
    let tween: { kill: () => void } | undefined;
    const go = () => {
      if (cancelled || done) return;
      done = true;
      router.push(to);
    };

    const interval = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const safety = window.setTimeout(go, seconds * 1000 + 150); // never strand the user

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && barRef.current) {
      import("gsap")
        .then(({ gsap }) => {
          if (cancelled || !barRef.current) return;
          tween = gsap.fromTo(
            barRef.current,
            { scaleX: 1 },
            { scaleX: 0, duration: seconds, ease: "none", transformOrigin: "left center", onComplete: go }
          );
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(safety);
      tween?.kill();
    };
  }, [router, seconds, to]);

  return (
    <div className="mx-auto mt-9 max-w-sm" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-sm text-[#aebfd6]">
        <span>Taking you home…</span>
        <span className="font-mono tabular-nums">{left}s</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          ref={barRef}
          className="h-full rounded-full bg-[#7fb0ff]"
          style={{ transform: "scaleX(1)", transformOrigin: "left center" }}
        />
      </div>
      <button
        type="button"
        onClick={() => router.push(to)}
        className="mt-4 text-xs font-semibold text-[#7fb0ff] underline underline-offset-2 hover:text-white"
      >
        Go now
      </button>
    </div>
  );
}

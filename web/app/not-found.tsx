import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

const LINKS = [
  { href: "/reports", label: "Reports", desc: "Browse the latest editions." },
  { href: "/track-record", label: "Track record", desc: "Every call, scored." },
  { href: "/how-it-works", label: "How it works", desc: "The publish-then-grade method." },
  { href: "/pricing", label: "Pricing", desc: "Free Snapshot vs Pro." },
];

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(52rem 28rem at 50% -12%, rgba(127,176,255,0.18), transparent 60%), radial-gradient(40rem 26rem at 100% 0%, rgba(20,58,100,0.5), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:py-28">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#7fb0ff]">Error 404</p>
        <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          This page is off the tape.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[#c9d6e8]">
          The link is broken, or the edition was unpublished. Here is where to head instead.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild className="h-11 bg-white px-6 text-base text-navy shadow-sm hover:bg-white/90">
            <Link href="/">Back home</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/reports">
              Browse reports
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <div className="mx-auto mt-10 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/25 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{l.label}</span>
                <ArrowRight className="size-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
              <p className="mt-1 text-sm text-[#aebfd6]">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

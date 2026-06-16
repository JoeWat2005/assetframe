import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, Code2, ArrowRight } from "lucide-react";
import { Hero } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/site.config";

export const metadata: Metadata = {
  title: "Developers",
  description: "Bring AssetFrame research into your tools and agents — over MCP or a simple read-only REST API.",
  alternates: { canonical: "/developers" },
};

const CARDS = [
  { href: "/developers/mcp", icon: Terminal, title: "MCP server", desc: "Connect Claude, Cursor and other agents directly to AssetFrame research over the Model Context Protocol." },
  { href: "/developers/api", icon: Code2, title: "REST API", desc: "A simple read-only JSON API for the report catalog, individual Snapshots and the track record." },
];

export default function DevelopersPage() {
  return (
    <>
      <Hero title="Developers" tag="Bring AssetFrame research into your tools and agents — over MCP or a simple REST API." />
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-muted-foreground" data-animate="up">
          Everything we publish is available to read programmatically. The free tier covers the report catalog,
          each free Snapshot and the public track record — no key required. The full Pro analysis stays behind a
          subscription.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2" data-animate="up">
          {CARDS.map((c) => (
            <Card key={c.href}>
              <CardContent className="flex h-full flex-col gap-2">
                <c.icon className="size-6 text-navy" aria-hidden="true" />
                <h2 className="text-lg font-bold text-navy">{c.title}</h2>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
                <Link href={c.href} className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-navy hover:underline">
                  Read the guide <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-[#cdd9ea] bg-tile px-4 py-3 text-sm text-[#33415c]" data-animate="up">
          What you can access: the report catalog (instrument, directional status, risk, confidence, window),
          each free Snapshot (text plus a short-lived PDF link), and the public track record (hit rate, streaks,
          calibration).
        </div>
        <p className="mt-6 text-xs text-muted-foreground" data-animate="up">{SITE.disclaimer}</p>
      </div>
    </>
  );
}

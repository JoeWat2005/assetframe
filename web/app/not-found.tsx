import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero, Section } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RedirectCountdown from "@/components/RedirectCountdown";

export const metadata = { title: "Page not found" };

const LINKS = [
  { href: "/reports", label: "Reports", desc: "Browse the latest editions." },
  { href: "/track-record", label: "Track record", desc: "Every call, scored against the market." },
  { href: "/how-it-works", label: "How it works", desc: "The publish-then-grade method." },
  { href: "/pricing", label: "Pricing", desc: "Free Snapshot vs Pro." },
];

export default function NotFound() {
  return (
    <>
      <Hero
        title="This page is off the map."
        tag="Error 404 — the link is broken, or the edition may have been unpublished. We'll take you home automatically."
      >
        <RedirectCountdown seconds={5} to="/" />
        <div className="mt-7 flex flex-wrap gap-3">
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
      </Hero>

      <Section title="Try one of these" lead="Popular destinations on AssetFrame.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Card key={l.href} className="group transition hover:border-navy/30 hover:shadow-sm">
              <CardContent>
                <Link href={l.href} className="block">
                  <span className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{l.label}</span>
                    <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-navy" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{l.desc}</span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <div className="h-12" />
    </>
  );
}

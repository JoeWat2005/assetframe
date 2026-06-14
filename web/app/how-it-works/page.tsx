import type { Metadata } from "next";
import Link from "next/link";
import { Database, Crosshair, Send, Scale, ListChecks, ArrowRight } from "lucide-react";
import { Hero } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How AssetFrame works: every report registers falsifiable predictions before the session, then grades them Hit / Miss / No-trigger against the price tape in an append-only ledger.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  { icon: Database, title: "Generate", body: "The engine pulls warm-up-extended market data and computes indicators, pivots and level statistics. The analysis is authored into one canonical payload, then both reports render behind a strict QA gate." },
  { icon: Crosshair, title: "Register", body: "Every Pro report logs falsifiable predictions — exact levels and an exact window — before the session opens. Nothing is vague; each call can be proven right or wrong." },
  { icon: Send, title: "Publish", body: "The free Snapshot opens for everyone; the Pro report unlocks with a subscription. Files are served from a CDN, so it's fast no matter how many people read it." },
  { icon: Scale, title: "Score", body: "After the window closes, the engine grades each prediction against the actual price tape — Hit, Miss or No-trigger — with no human nudging the result." },
  { icon: ListChecks, title: "Append", body: "Results land in an append-only ledger. Rows are never edited, re-tuned or cherry-picked, and a calibration table appears once ten reports are scored." },
];

export default function HowItWorksPage() {
  return (
    <>
      <Hero title="How it works" tag="Published before the outcome. Graded against the tape. Nothing rewritten." />
      <div className="mx-auto max-w-3xl px-5 py-10">
        <ol className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} data-animate="up">
              <Card className="flex-row items-start gap-4 p-5 sm:p-6">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                  <s.icon className="size-5" />
                </div>
                <CardContent className="px-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <h2 className="text-lg font-bold text-navy">{s.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-ink">{s.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-4 sm:grid-cols-2" data-animate="up">
          <Card className="p-5">
            <CardContent className="px-0">
              <div className="text-sm font-bold text-navy">Snapshot — free</div>
              <p className="mt-1 text-sm text-ink">Status &amp; risk, the expected range, one chart and the thesis. The one-page read for everyone.</p>
            </CardContent>
          </Card>
          <Card className="p-5">
            <CardContent className="px-0">
              <div className="text-sm font-bold text-[#9a6700]">Pro — subscription</div>
              <p className="mt-1 text-sm text-ink">Conditional setups with R:R, the price ladder, scorecard, the registered predictions and the full scored ledger.</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap gap-3" data-animate="up">
          <Button asChild>
            <Link href="/reports">Browse reports<ArrowRight data-icon="inline-end" /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

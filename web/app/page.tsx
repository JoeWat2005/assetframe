import Link from "next/link";
import { ArrowRight, ShieldCheck, Layers, Clock, BadgeCheck } from "lucide-react";
import { getCatalog, getTrackRecord } from "@/lib/content";
import { Section } from "@/components/ui";
import ReportCard from "@/components/ReportCard";
import Countdown from "@/components/Countdown";
import HeroBackdrop from "@/components/HeroBackdrop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/site.config";

// Publishing model: editions change only when a new one is published, so serve a
// cached static render and revalidate in the background. Fast for everyone, light on the DB.
export const revalidate = 300;

const WHAT = [
  {
    icon: Layers,
    title: "We cover the instrument",
    body: "Stocks, crypto, FX, commodities and indices — one focused edition per name.",
  },
  {
    icon: Clock,
    title: "Published before the move",
    body: "A clear directional read, the key levels and the catalysts that matter — out ahead of the session.",
  },
  {
    icon: BadgeCheck,
    title: "Scored after the fact",
    body: "Every call is logged before its window and graded against the tape — a public, honest track record.",
  },
];

export default async function Home() {
  const catalog = (await getCatalog()).slice(0, 6);
  const tr = await getTrackRecord();

  const stats: [React.ReactNode, string][] = [
    [tr.stats.hitRate === null ? "—" : `${tr.stats.hitRate}%`, "Hit rate"],
    [tr.stats.longestStreak, "Longest streak"],
    [tr.stats.reportsScored, "Reports scored"],
    [tr.stats.predictionsGraded, "Predictions graded"],
  ];

  return (
    <>
      {/* -mt-14 cancels AppFrame's reserved header height so the hero is full-bleed to the
          very top (the header is hidden here until you scroll past the fold). */}
      <div className="-mt-14 flex min-h-[100dvh] flex-col">
      <section className="relative isolate flex flex-1 items-center overflow-hidden bg-navy text-white">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-14 sm:px-5" data-animate="hero">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
            <ShieldCheck className="size-3.5 text-[#7fb0ff]" />
            Published before the move, graded after
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Next-session market intelligence,{" "}
            <span className="text-[#7fb0ff]">scored after the fact.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[#c9d6e8]">
            AssetFrame publishes pre-session research on stocks, crypto, FX and commodities — a clear
            directional read with the levels that matter. Every call is logged before the market moves
            and graded against the tape afterwards, so our track record is public.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="h-11 bg-white px-6 text-base text-navy shadow-sm hover:bg-white/90">
              <Link href="/reports">Browse reports</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/track-record">
                See the track record
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* slim next-edition strip — keeps the hero uncluttered */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div>
            <span className="text-sm font-semibold text-ink">Next edition drops in</span>
            <span className="block text-xs text-muted-foreground">{SITE.publish.label}</span>
          </div>
          <Countdown tone="light" showLabel={false} />
        </div>
      </div>
      </div>

      <Section
        title="What AssetFrame does"
        lead="Independent, accountable market research — not tips, not signals, and never a recommendation to buy or sell."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {WHAT.map((w) => (
            <Card key={w.title} data-animate="up">
              <CardContent>
                <w.icon className="size-5 text-navy" />
                <div className="mt-3 text-base font-bold text-ink">{w.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{w.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Latest editions" lead="A directional read and the levels that matter on each instrument. Open one to read the full report.">
        {catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No editions published yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((e) => (
              <ReportCard key={`${e.date}/${e.slug}`} e={e} />
            ))}
          </div>
        )}
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/reports">
              All reports
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </Section>

      <Section title="How accurate are we?" lead="Don't take our word for it. Here's the running scorecard.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(([n, l]) => (
            <Card key={l} data-animate="up">
              <CardContent>
                <div className="text-3xl font-extrabold text-navy">{n}</div>
                <div className="mt-1 text-[13px] text-muted-foreground">{l}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        {tr.stats.reportsScored === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No reports scored yet. The first results post as the current open calls close.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {tr.stats.currentStreak > 0 ? `Currently on a ${tr.stats.currentStreak}-report accurate streak. ` : ""}
            Every prediction is registered before its window and graded after. The full append-only
            record is part of Pro.{" "}
            <Link className="font-semibold text-navy underline underline-offset-2" href="/track-record">
              See the full record →
            </Link>
          </p>
        )}
      </Section>

      <div className="h-12" />
    </>
  );
}

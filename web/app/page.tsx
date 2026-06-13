import Link from "next/link";
import Image from "next/image";
import { getCatalog } from "@/lib/content";
import { getTrackRecord } from "@/lib/content";
import { Badge, Btn, Section } from "@/components/ui";
import { SITE } from "@/site.config";

export default async function Home() {
  const catalog = (await getCatalog()).slice(0, 6);
  const tr = await getTrackRecord();

  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-5 sm:py-16">
          <h1>
            <Image src="/logo-white.png" alt={SITE.brand} width={300} height={61} priority
              className="h-12 w-auto sm:h-14" />
            <span className="sr-only">{SITE.brand}</span>
          </h1>
          <p className="mt-4 text-lg text-[#c9d6e8] sm:text-xl">{SITE.tagline}</p>
          <p className="mt-5 max-w-2xl text-[#aebfd6]">
            Pre-session research on the instruments that matter — a free one-page Snapshot for
            everyone, and a full Pro report with conditional setups, a price ladder and a scored
            outcome ledger. Every call is published <b className="text-white">before</b> the outcome
            and graded against the tape afterwards. General market research, not personal advice.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/reports" className="rounded-lg bg-white px-5 py-2.5 font-bold text-navy hover:bg-[#eef2f8]">
              Browse free reports
            </Link>
            <Link href="/track-record" className="rounded-lg border border-white/40 px-5 py-2.5 font-bold text-white hover:bg-white/10">
              See the track record →
            </Link>
          </div>
        </div>
      </section>

      <Section title="Latest editions" lead="Free Snapshots open in your browser. Pro reports unlock with a subscription.">
        {catalog.length === 0 ? (
          <p className="text-sm text-muted">No editions published yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((e) => (
              <div key={`${e.date}/${e.slug}`} className="flex flex-col rounded-xl border border-line bg-white p-4">
                <div className="text-lg font-bold">{e.instrument}</div>
                <div className="text-[13px] font-semibold text-muted">{e.ticker}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {e.status && <Badge label={e.status} kind="status" />}
                  {e.risk && <Badge label={e.risk} kind="risk" />}
                </div>
                <div className="mt-2 text-sm">{e.bias}</div>
                <div className="mt-3 flex gap-2 pt-2">
                  <Btn href={`/reports/${e.date}/${e.slug}`} variant="primary" sm>Open</Btn>
                  <Btn href={e.freeHtml} external sm>Snapshot</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5"><Btn href="/reports">All reports →</Btn></div>
      </Section>

      <Section title="Scored, not cherry-picked" lead="The accountability the rest of the industry skips.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            [tr.stats.reportsScored, "Reports scored"],
            [tr.stats.openCalls, "Open calls"],
            [tr.stats.hitRate === null ? "—" : `${tr.stats.hitRate}%`, "Hit rate"],
            [tr.stats.predictionsGraded, "Predictions graded"],
          ].map(([n, l]) => (
            <div key={l as string} className="rounded-xl border border-line bg-white p-4">
              <div className="text-3xl font-extrabold text-navy">{n}</div>
              <div className="mt-1 text-[13px] text-muted">{l}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Every Pro report registers falsifiable predictions before the window opens; we grade them
          against the tape afterwards and publish the append-only ledger. <Link className="text-navy underline" href="/track-record">See it →</Link>
        </p>
      </Section>

      <div className="h-10" />
    </>
  );
}

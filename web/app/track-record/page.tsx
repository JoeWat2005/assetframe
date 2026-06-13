import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, getTrackRecord } from "@/lib/content";
import { getEntitlement } from "@/lib/entitlements";
import { Hero, Note } from "@/components/ui";
import OpenCallsBrowser from "@/components/OpenCallsBrowser";
import BuyButton from "@/components/BuyButton";
import { SITE } from "@/site.config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track record" };

const stat = (n: React.ReactNode, l: string) => (
  <div className="rounded-xl border border-line bg-white p-4">
    <div className="text-3xl font-extrabold text-navy">{n}</div>
    <div className="mt-1 text-[13px] text-muted-foreground">{l}</div>
  </div>
);

export default async function TrackRecordPage() {
  const ent = await getEntitlement();
  const tr = await getTrackRecord();

  // The full record is a Pro benefit. Free / signed-out visitors see the public
  // headline accuracy (same numbers as the homepage) and an upgrade prompt.
  if (!ent.subscribed) {
    return (
      <>
        <Hero title="Track record" tag="Scored after the fact — the full record is part of AssetFrame Pro." />
        <div className="mx-auto max-w-3xl px-5 py-10">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stat(tr.stats.hitRate === null ? "—" : `${tr.stats.hitRate}%`, "Hit rate")}
            {stat(tr.stats.longestStreak, "Longest streak")}
            {stat(tr.stats.reportsScored, "Reports scored")}
            {stat(tr.stats.predictionsGraded, "Predictions graded")}
          </div>

          <Note>
            The headline accuracy above is public. The full record — every open call, each scored
            result, the per-prediction detail and the calibration table — is for AssetFrame Pro
            subscribers. Every call is still published before its outcome and graded against the tape.
          </Note>

          {ent.signedIn ? (
            <BuyButton>Subscribe {SITE.proPrice} to see the full record</BuyButton>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-in" className="rounded-lg bg-navy px-5 py-2.5 font-bold text-white hover:bg-navy-700">
                Sign in
              </Link>
              <Link href="/pricing" className="rounded-lg border border-navy px-5 py-2.5 font-bold text-navy hover:bg-tile">
                See pricing
              </Link>
            </div>
          )}
        </div>
      </>
    );
  }

  // Map symbol → asset class (from the catalog) so open calls can be filtered by asset.
  const catalog = await getCatalog();
  const assetByTicker: Record<string, string> = {};
  for (const e of catalog) if (e.ticker) assetByTicker[e.ticker] = e.assetClass;

  return (
    <>
      <Hero title="Track record" tag="The scored-after-the-fact promise, made mechanical." />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stat(tr.stats.hitRate === null ? "—" : `${tr.stats.hitRate}%`, "Hit rate (graded)")}
          {stat(tr.stats.longestStreak, "Longest streak")}
          {stat(tr.stats.reportsScored, "Reports scored")}
          {stat(tr.stats.predictionsGraded, "Predictions graded")}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[#cdd9ea] bg-tile px-4 py-3 text-sm text-[#33415c]">
          <span>Predictions are registered <b>before</b> each window, then graded Hit / Miss / No-trigger against the tape — append-only, never re-tuned.</span>
          <Link href="/how-it-works" className="font-semibold text-navy underline underline-offset-2">How it works →</Link>
        </div>

        <h2 className="mt-8 mb-1 text-xl font-bold text-navy">Prediction calls</h2>
        <p className="mb-3 text-sm text-muted-foreground">Each call registers its predictions before the window. The badge tracks how many came true (hits/total) once the engine scores it — a majority feeds the homepage streak. Filter by asset or date, then open one to see every prediction.</p>
        <OpenCallsBrowser open={tr.open} assetClass={assetByTicker} />

        <h2 className="mt-8 mb-1 text-xl font-bold text-navy">Scored results</h2>
        {tr.scored.length === 0 ? (
          <Note>No reports scored yet — the first results land once the open calls above close. <b>Ledger starts here.</b></Note>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-xl border border-line bg-white text-sm">
              <thead className="bg-tile text-navy">
                <tr>
                  <th className="p-3 text-left">Instrument</th><th className="p-3 text-left">View</th>
                  <th className="p-3 text-left">Conf.</th><th className="p-3 text-left">Results</th>
                  <th className="p-3 text-left">Hit rate</th><th className="p-3 text-left">Window end</th>
                </tr>
              </thead>
              <tbody>
                {tr.scored.map((r, i) => {
                  const good = Number(r.hitRate) >= 50;
                  return (
                    <tr key={`${r.instrument}-${r.windowEnd}-${i}`} className="border-t border-line">
                      <td className="p-3"><b>{r.instrument}</b></td><td className="p-3">{r.view}</td>
                      <td className="p-3">{r.confidence}</td><td className="p-3">{r.results}</td>
                      <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${good ? "bg-[#dafbe1] text-[#1a7f37]" : "bg-[#ffebe9] text-[#cf222e]"}`}>{r.hitRate}%</span></td>
                      <td className="p-3">{r.windowEnd}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tr.calibration && (
          <>
            <h2 className="mt-8 mb-1 text-xl font-bold text-navy">Calibration</h2>
            <p className="mb-3 text-sm text-muted-foreground">Does stated confidence track realised hit rate? It should.</p>
            <div className="overflow-x-auto">
            <table className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-white text-sm">
              <thead className="bg-tile text-navy"><tr><th className="p-3 text-left">Stated confidence</th><th className="p-3 text-left">Realised</th><th className="p-3 text-left">Reports</th></tr></thead>
              <tbody>
                {Object.entries(tr.calibration).map(([k, v]) => (
                  <tr key={k} className="border-t border-line">
                    <td className="p-3">{k}</td><td className="p-3">{v.hitRate === null ? "—" : `${v.hitRate}%`}</td><td className="p-3">{v.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

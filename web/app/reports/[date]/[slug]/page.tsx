import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCatalog, getEdition } from "@/lib/content";
import { getEntitlement } from "@/lib/entitlements";
import { Badge, Btn, Note } from "@/components/ui";
import BuyButton from "@/components/BuyButton";
import { SITE } from "@/site.config";

export const dynamic = "force-dynamic"; // reads auth for the Pro section

export async function generateStaticParams() {
  return (await getCatalog()).map((e) => ({ date: e.date, slug: e.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ date: string; slug: string }> }
): Promise<Metadata> {
  const { date, slug } = await params;
  const e = await getEdition(date, slug);
  return { title: e ? `${e.instrument} — ${e.reportDate}` : "Report" };
}

export default async function ReaderPage(
  { params }: { params: Promise<{ date: string; slug: string }> }
) {
  const { date, slug } = await params;
  const e = await getEdition(date, slug);
  if (!e) notFound();

  const ent = await getEntitlement();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/reports" className="text-sm text-muted hover:text-navy">← All reports</Link>
      <h1 className="mt-2 text-3xl font-bold">{e.instrument}</h1>
      <div className="text-sm font-semibold text-muted">{e.ticker} · {e.assetClass}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {e.status && <Badge label={e.status} kind="status" />}
        {e.risk && <Badge label={e.risk} kind="risk" />}
      </div>
      <p className="mt-3 text-[15px]">{e.bias}</p>
      <p className="mt-1 text-sm text-muted">Edition {e.reportDate} · prediction window to {e.windowEnd}</p>
      {e.catalystStatus && <p className="mt-1 text-sm text-muted"><b>Catalyst:</b> {e.catalystStatus}</p>}

      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        <div className="text-lg font-bold">Free Snapshot</div>
        <p className="mt-1 text-sm text-muted">The one-page read: status, risk, broad range, one chart and the thesis.</p>
        <div className="mt-3 flex gap-2">
          <Btn href={e.freeHtml} variant="primary" external sm>Read Snapshot</Btn>
          <Btn href={e.freePdf} external sm>Download PDF</Btn>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#e6c88a] bg-[#fffdf5] p-5">
        <div className="text-lg font-bold text-[#9a6700]">Pro report</div>
        <p className="mt-1 text-sm text-muted">
          Conditional long & short setups, the price ladder, sentiment, risk math, the trade-quality
          scorecard, the outcome ledger and the full source audit.
        </p>
        {ent.subscribed ? (
          <div className="mt-3 flex gap-2">
            <Btn href={`/api/pro/${e.date}/${e.slug}/pro.html`} variant="primary" external sm>Open Pro report</Btn>
            <Btn href={`/api/pro/${e.date}/${e.slug}/pro.pdf`} external sm>Pro PDF</Btn>
          </div>
        ) : ent.signedIn ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BuyButton>Subscribe to unlock</BuyButton>
            <Btn href="/pricing" sm>What&apos;s in Pro?</Btn>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <Btn href="/sign-in" variant="pro" sm>Sign in</Btn>
            <Btn href="/pricing" sm>What&apos;s in Pro?</Btn>
          </div>
        )}
      </div>

      <Note>{SITE.disclaimer}</Note>
    </div>
  );
}

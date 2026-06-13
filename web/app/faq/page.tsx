import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Hero } from "@/components/ui";
import { SITE } from "@/site.config";

export const metadata: Metadata = { title: "FAQ" };

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is AssetFrame?",
    a: <>A market-research service. For each instrument we publish a free one-page <b>Snapshot</b> and a paid <b>Pro</b> report, then grade every call against the market afterwards.</>,
  },
  {
    q: "Is this financial advice?",
    a: <>No. AssetFrame is general research and decision support — not a personal recommendation and not regulated advice. We never tell you to buy or sell, and we place no trades. See the <Link className="text-navy underline" href="/terms">Terms</Link>.</>,
  },
  {
    q: "What's the difference between Snapshot and Pro?",
    a: <>Snapshot is the free one-pager: status, risk, expected range, one chart and the thesis. Pro adds conditional setups with R:R, the price ladder, the scorecard, the registered predictions and the full scored ledger.</>,
  },
  {
    q: "How is the track record scored?",
    a: <>Every Pro report registers falsifiable predictions — exact levels and an exact window — before the session. After the window closes the engine grades each one Hit / Miss / No-trigger against the price tape and appends a row that's never edited. <Link className="text-navy underline" href="/how-it-works">How it works →</Link></>,
  },
  {
    q: "How much does Pro cost, and how do I pay?",
    a: <>Pro is {SITE.proPrice}, billed securely through our merchant of record (which handles VAT). You can subscribe from any report or the pricing page.</>,
  },
  {
    q: "How do I cancel?",
    a: <>Anytime, from <Link className="text-navy underline" href="/account/subscription">your subscription page</Link> — one click, and access continues to the end of the period you've paid for.</>,
  },
  {
    q: "Where does the data come from?",
    a: <>Market data and public sources, with each report disclosing its sources and any data-quality limitations. Figures may be delayed; we never guarantee accuracy or outcomes.</>,
  },
  {
    q: "Which instruments do you cover?",
    a: <>Futures, FX, crypto and US single stocks. The published menu grows over time — browse the latest editions on the <Link className="text-navy underline" href="/reports">reports page</Link>.</>,
  },
];

export default function FaqPage() {
  return (
    <>
      <Hero title="Frequently asked questions" tag="What AssetFrame is, how it's scored, and how billing works." />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="overflow-hidden rounded-xl border border-line bg-white" data-animate="up">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-b border-line last:border-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</div>
            </details>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground" data-animate="up">
          Still stuck? Email <a className="text-navy underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>
      </div>
    </>
  );
}

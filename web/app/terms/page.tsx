import type { Metadata } from "next";
import { Hero } from "@/components/ui";
import { SITE } from "@/site.config";

export const metadata: Metadata = { title: "Terms & Conditions" };

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold text-navy">{n}. {title}</h2>
      <div className="mt-1 space-y-2 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <Hero title="Terms & Conditions" tag="The agreement for using AssetFrame." />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-sm text-muted">
          Last updated: June 2026. Please read these terms carefully. By using {SITE.brand} (the website at{" "}
          <a className="text-navy underline" href={SITE.url}>{SITE.url.replace(/^https?:\/\//, "")}</a>) you agree to them.
        </p>

        <Clause n="1" title="What AssetFrame is — and is not">
          <p>{SITE.brand} publishes <b>general market research and decision-support analysis</b> on financial instruments. It is information and education only.</p>
          <p><b>It is not investment advice and not a personal recommendation.</b> We do not know your circumstances, objectives or risk tolerance, and nothing on this site is a suggestion that any specific person should buy, sell or hold any instrument. We do not provide a personal recommendation or advice within the meaning of the UK regulatory regime, and we do not arrange, deal in or manage investments.</p>
          <p>Our research uses defined, neutral language — &ldquo;research view&rdquo;, &ldquo;conditional scenario&rdquo;, &ldquo;invalidation&rdquo; — describing how price <i>might</i> behave under stated conditions. These are analytical references, never instructions.</p>
        </Clause>

        <Clause n="2" title="No reliance; do your own research">
          <p>You are solely responsible for your own decisions. Markets are uncertain and prices can move sharply against any analysis. Past performance and any published track record are not a guide to future results. <b>No outcome is guaranteed.</b> You should carry out your own research and, where appropriate, consult an FCA-authorised financial adviser before making any decision.</p>
        </Clause>

        <Clause n="3" title="Data and accuracy">
          <p>Reports are generated from third-party market data and public sources believed to be reliable, but we do not warrant that any figure, level or statement is accurate, complete or current. Data may be delayed. Each report discloses its sources and data-quality limitations; read them.</p>
        </Clause>

        <Clause n="4" title="Subscriptions and payment">
          <p>AssetFrame Pro is a paid subscription billed through our merchant of record, which appears on your statement and handles applicable taxes. Subscriptions renew until cancelled; you may cancel at any time from your receipt or account, and access continues to the end of the paid period. Refunds are handled per the merchant of record&apos;s policy and applicable consumer law.</p>
        </Clause>

        <Clause n="5" title="Access and acceptable use">
          <p>Pro content is licensed to you for personal, non-commercial use. You may not redistribute, resell, scrape, or share paid reports or your access credentials. We may suspend access for breach, abuse, or non-payment.</p>
        </Clause>

        <Clause n="6" title="No trade execution">
          <p>{SITE.brand} never places, modifies or cancels orders, and has no access to your brokerage or funds. Any execution is entirely your own action elsewhere.</p>
        </Clause>

        <Clause n="7" title="Limitation of liability">
          <p>To the fullest extent permitted by law, {SITE.brand} and its operators are not liable for any trading or investment losses, lost profits, or indirect or consequential losses arising from use of the site or reliance on its content. Nothing in these terms excludes liability that cannot be excluded by law.</p>
        </Clause>

        <Clause n="8" title="Changes and governing law">
          <p>We may update these terms; continued use means acceptance. These terms are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction.</p>
        </Clause>

        <Clause n="9" title="Contact">
          <p>Questions about these terms: <a className="text-navy underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
        </Clause>

        <p className="mt-8 rounded-lg bg-tile p-4 text-xs text-muted">
          This template reflects AssetFrame&apos;s market-research positioning. Have your own solicitor confirm
          it fits your final business structure and jurisdictions before launch.
        </p>
      </div>
    </>
  );
}

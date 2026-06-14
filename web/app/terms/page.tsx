import type { Metadata } from "next";
import { Hero } from "@/components/ui";
import { SITE } from "@/site.config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "AssetFrame Terms & Conditions — market research, not regulated advice; subscriptions, acceptable use, IP and liability.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "14 June 2026";

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold text-navy">{n}. {title}</h2>
      <div className="mt-1 space-y-2 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const host = SITE.url.replace(/^https?:\/\//, "");
  return (
    <>
      <Hero title="Terms & Conditions" tag="The agreement for using AssetFrame." />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-sm text-muted-foreground">
          Last updated: {UPDATED}. These terms are a binding agreement between you and {SITE.brand}
          (&ldquo;{SITE.brand}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By accessing{" "}
          <a className="text-navy underline" href={SITE.url}>{host}</a> or subscribing, you agree to them.
          If you do not agree, do not use the service.
        </p>

        <Clause n="1" title="What AssetFrame is — and is not">
          <p>{SITE.brand} publishes <b>general market research and decision-support analysis</b> on financial instruments. It is information and education only.</p>
          <p><b>It is not investment advice and not a personal recommendation.</b> We do not know your circumstances, objectives or risk tolerance, and nothing on this site is a suggestion that any specific person should buy, sell or hold any instrument. We do not provide a personal recommendation or advice within the meaning of the UK regulatory regime, and we do not arrange, deal in, or manage investments. {SITE.brand} is not authorised or regulated by the Financial Conduct Authority.</p>
          <p>Our research uses defined, neutral language — &ldquo;research view&rdquo;, &ldquo;conditional scenario&rdquo;, &ldquo;invalidation&rdquo; — describing how price <i>might</i> behave under stated conditions. These are analytical references, never instructions.</p>
        </Clause>

        <Clause n="2" title="Eligibility">
          <p>You must be at least 18 years old and able to form a binding contract to use {SITE.brand}. You may not use the service where doing so would be unlawful in your jurisdiction, and you are responsible for compliance with your local laws.</p>
        </Clause>

        <Clause n="3" title="Your account">
          <p>Authentication is provided by our identity provider, Clerk. You agree to give accurate information, to keep your credentials secure, and not to share your account. You are responsible for activity under your account. Tell us promptly at <a className="text-navy underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> if you suspect unauthorised use.</p>
        </Clause>

        <Clause n="4" title="No reliance; do your own research">
          <p>You are solely responsible for your own decisions. Markets are uncertain and prices can move sharply against any analysis. Past performance and any published track record are not a guide to future results, and our scoring is for transparency only. <b>No outcome is guaranteed.</b> You should carry out your own research and, where appropriate, consult an FCA-authorised financial adviser before making any decision.</p>
        </Clause>

        <Clause n="5" title="Data and accuracy">
          <p>Reports are generated from third-party market data and public sources believed to be reliable, but we do not warrant that any figure, level, or statement is accurate, complete, or current. Data may be delayed or contain errors. Each report discloses its sources and data-quality limitations; read them before relying on anything.</p>
        </Clause>

        <Clause n="6" title="Subscriptions, billing and renewals">
          <p>AssetFrame Pro is a paid subscription sold and billed by our merchant of record, <b>Lemon Squeezy</b>, which is the seller of record, appears on your statement, and collects any applicable taxes (such as VAT). The price and billing period are shown at checkout. Unless stated otherwise, subscriptions <b>renew automatically</b> at the end of each period at the then-current price until cancelled. We may change prices on renewal with reasonable notice.</p>
        </Clause>

        <Clause n="7" title="Cancellation and refunds">
          <p>You can cancel at any time from your account or your Lemon Squeezy receipt. Cancellation stops future renewals; your access continues until the end of the period you have already paid for, and we do not provide partial-period refunds except where required by law.</p>
          <p>Because Pro provides immediate access to digital content, you agree that supply begins as soon as you access it and, to the extent permitted by law, you lose the statutory 14-day right to cancel for a refund once access has started. Refunds, where due, are handled under the merchant of record&apos;s policy and applicable consumer law.</p>
        </Clause>

        <Clause n="8" title="Acceptable use and licence">
          <p>We grant you a limited, personal, non-exclusive, non-transferable, revocable licence to access reports for your own <b>personal, non-commercial</b> use. You may not, and may not permit others to: redistribute, republish, resell, sub-licence, or publicly share reports; share your access credentials; scrape, crawl, or harvest the site or use automated means to access it beyond ordinary browsing; circumvent access controls or paywalls; reverse-engineer the service; or use the content to build a competing product. We may suspend or terminate access for breach, abuse, fraud, or non-payment.</p>
        </Clause>

        <Clause n="9" title="Intellectual property">
          <p>The site, the reports, the {SITE.brand} name and logo, and all related software, text, design, and data compilations are owned by {SITE.brand} or its licensors and are protected by intellectual-property laws. Except for the limited licence in clause 8, no rights are granted to you. Market data remains the property of its respective providers.</p>
        </Clause>

        <Clause n="10" title="No trade execution">
          <p>{SITE.brand} never places, modifies, or cancels orders, and has no access to your brokerage account or funds. Any execution is entirely your own action elsewhere, at your own risk.</p>
        </Clause>

        <Clause n="11" title="Third-party services">
          <p>We rely on third parties to run the service — including Clerk (authentication), Lemon Squeezy (payments), Vercel (hosting), and Cloudflare (storage and delivery). Your use of those services may also be subject to their terms. We are not responsible for third-party websites or resources linked from the site.</p>
        </Clause>

        <Clause n="12" title="Availability and changes to the service">
          <p>We aim to keep the service available but do not guarantee uninterrupted or error-free operation, and we may change, suspend, or discontinue features (including publishing cadence) at any time. Reports are published as editions and may be updated or withdrawn.</p>
        </Clause>

        <Clause n="13" title="Disclaimer of warranties">
          <p>The service and all content are provided <b>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</b> without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy, or non-infringement, to the fullest extent permitted by law.</p>
        </Clause>

        <Clause n="14" title="Limitation of liability">
          <p>To the fullest extent permitted by law, {SITE.brand} and its operators are not liable for any trading or investment losses, lost profits, lost data, or any indirect, special, or consequential loss arising from use of the site or reliance on its content. Where liability cannot be excluded, our total aggregate liability is limited to the amount you paid us in the 12 months before the claim. <b>Nothing in these terms excludes or limits liability that cannot lawfully be excluded</b>, including for death or personal injury caused by negligence, or for fraud.</p>
        </Clause>

        <Clause n="15" title="Indemnity">
          <p>You agree to indemnify {SITE.brand} against claims, losses, and reasonable costs arising from your breach of these terms or your misuse of the service.</p>
        </Clause>

        <Clause n="16" title="Suspension and termination">
          <p>We may suspend or terminate your access if you breach these terms or to protect the service or other users. You may stop using the service at any time. Clauses that by their nature should survive (including 1, 4, 9, 13, 14, 15 and 17) survive termination.</p>
        </Clause>

        <Clause n="17" title="General; governing law">
          <p>If any provision is held unenforceable, the rest remain in effect. Our failure to enforce a term is not a waiver. You may not assign these terms; we may assign them to a successor of our business. These terms are the entire agreement between us regarding the service. They are governed by the laws of <b>England and Wales</b>, and the courts of England and Wales have exclusive jurisdiction, subject to any mandatory consumer-protection rights you have where you live.</p>
        </Clause>

        <Clause n="18" title="Changes to these terms">
          <p>We may update these terms from time to time. Material changes will be reflected by the &ldquo;last updated&rdquo; date above, and continued use after a change means you accept the updated terms.</p>
        </Clause>

        <Clause n="19" title="Contact">
          <p>Questions about these terms: <a className="text-navy underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
        </Clause>
      </div>
    </>
  );
}

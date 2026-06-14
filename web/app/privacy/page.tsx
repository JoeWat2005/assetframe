import type { Metadata } from "next";
import { Hero } from "@/components/ui";
import { SITE } from "@/site.config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "AssetFrame Privacy Policy — what we collect, why, and your rights under UK GDPR.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "14 June 2026";

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold text-navy">{title}</h2>
      <div className="mt-1 space-y-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

const PROCESSORS = [
  ["Clerk", "Authentication & account management", "USA (with UK/EU safeguards)"],
  ["Lemon Squeezy", "Payments & subscriptions (merchant of record)", "USA (with UK/EU safeguards)"],
  ["Vercel", "Website hosting & privacy-friendly analytics", "USA / global edge"],
  ["Cloudflare", "Private file storage (R2) & content delivery", "Global edge"],
  ["Neon", "Database (report catalogue & track record)", "EU (London region)"],
  ["Google Analytics", "Optional usage analytics — only with your consent", "USA (with UK/EU safeguards)"],
];

export default function PrivacyPage() {
  return (
    <>
      <Hero title="Privacy Policy" tag="What we collect, why, and your rights." />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-sm text-muted-foreground">Last updated: {UPDATED}.</p>

        <Clause title="Who we are">
          <p>{SITE.brand} is the data controller for personal data processed through this site. For any privacy question or to exercise your rights, contact us at <a className="text-navy underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
        </Clause>

        <Clause title="What we collect">
          <p>We keep what we need to run the service, and no more:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><b>Account data</b> — your email address and authentication details, handled by our identity provider, Clerk.</li>
            <li><b>Subscription status</b> — whether you have an active AssetFrame Pro subscription, and the related billing identifiers we receive from our payment provider, so we can grant access.</li>
            <li><b>Payment data</b> — handled entirely by our merchant of record, Lemon Squeezy. We never see or store your full card details.</li>
            <li><b>Support correspondence</b> — messages you send us.</li>
            <li><b>Usage &amp; technical data</b> — privacy-friendly, aggregated analytics about how the site is used, plus standard server/CDN log data (such as IP address and device/browser type) used to deliver and secure the service.</li>
          </ul>
        </Clause>

        <Clause title="How we use it, and our legal bases">
          <p>We process your data to: create and secure your account; deliver the reports you are entitled to; process subscriptions and payments; provide support; measure and improve the service; and meet legal obligations.</p>
          <p>Our lawful bases under UK GDPR are: <b>performance of a contract</b> (your account, access, and billing); our <b>legitimate interests</b> in running, securing, and improving the service and preventing fraud; your <b>consent</b> for optional analytics cookies; and <b>legal obligation</b> where the law requires it (for example, tax records kept by our merchant of record).</p>
        </Clause>

        <Clause title="Cookies & analytics">
          <p><b>Strictly necessary cookies</b> — authentication and session cookies set by Clerk when you sign in. These are essential to log you in and need no consent.</p>
          <p><b>Cookieless measurement</b> — our default traffic and performance measurement (Vercel Web Analytics and Speed Insights) does not use cookies and does not identify you.</p>
          <p><b>Google Analytics</b> — loads <b>only after you accept</b> the cookie banner. If you choose Reject, no Google Analytics cookies are set. We store your banner choice in your browser&apos;s local storage so we don&apos;t ask again.</p>
        </Clause>

        <Clause title="Who we share it with">
          <p>We share data only with the service providers (processors) that run AssetFrame, each under their own data-protection terms. <b>We do not sell your personal data</b> and we do not share it for advertising.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full overflow-hidden rounded-xl border border-line bg-white text-sm">
              <thead className="bg-tile text-navy">
                <tr><th className="p-3 text-left">Provider</th><th className="p-3 text-left">Purpose</th><th className="p-3 text-left">Location</th></tr>
              </thead>
              <tbody>
                {PROCESSORS.map(([name, purpose, loc]) => (
                  <tr key={name} className="border-t border-line">
                    <td className="p-3 font-semibold">{name}</td><td className="p-3">{purpose}</td><td className="p-3 text-muted-foreground">{loc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Clause>

        <Clause title="International transfers">
          <p>Some of our providers process data outside the UK (for example, in the United States). Where they do, the transfer is protected by an appropriate safeguard recognised under UK law — such as an adequacy decision, the UK International Data Transfer Agreement, or the UK extension to the EU–US Data Privacy Framework.</p>
        </Clause>

        <Clause title="How long we keep it">
          <p>We keep account data while your account is active and for a reasonable period afterwards, then delete or anonymise it. Billing and tax records are retained by our merchant of record for as long as the law requires. Server and analytics logs are kept only for a short period for security and operational purposes.</p>
        </Clause>

        <Clause title="Your rights">
          <p>Under UK GDPR you have the right to access, correct, delete, or port your data, and to object to or restrict processing, and to withdraw consent at any time. Email <a className="text-navy underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> to exercise any of these and we will respond within the statutory time limit. You can also complain to the UK Information Commissioner&apos;s Office (ICO) at <a className="text-navy underline" href="https://ico.org.uk/" target="_blank" rel="noopener noreferrer">ico.org.uk</a>, though we&apos;d appreciate the chance to help first.</p>
        </Clause>

        <Clause title="Security">
          <p>Access to your account and to paid content is protected by authentication and short-lived, signed download links. Data is encrypted in transit, access is restricted, and we apply reasonable technical and organisational measures appropriate to the risk. No system is perfectly secure, but we work to protect your data and to notify you and the ICO of any breach where the law requires.</p>
        </Clause>

        <Clause title="Children">
          <p>AssetFrame is not intended for anyone under 18, and we do not knowingly collect data from children. If you believe a child has given us personal data, contact us and we will delete it.</p>
        </Clause>

        <Clause title="Changes to this policy">
          <p>We may update this policy from time to time. Material changes will be reflected by the &ldquo;last updated&rdquo; date above; significant changes affecting your rights will be brought to your attention.</p>
        </Clause>
      </div>
    </>
  );
}

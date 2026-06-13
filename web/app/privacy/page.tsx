import type { Metadata } from "next";
import { Hero } from "@/components/ui";
import { SITE } from "@/site.config";

export const metadata: Metadata = { title: "Privacy Policy" };

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold text-navy">{title}</h2>
      <div className="mt-1 space-y-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Hero title="Privacy Policy" tag="What we collect and why." />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-sm text-muted-foreground">Last updated: June 2026.</p>

        <Clause title="Who we are">
          <p>{SITE.brand} is the data controller for personal data processed through this site. Contact: <a className="text-navy underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
        </Clause>

        <Clause title="What we collect">
          <p>Account data (your email and authentication details) is handled by our authentication provider, Clerk. Payment data is handled by our merchant of record (Lemon Squeezy) — we never see or store your full card details. We hold your subscription status so we can grant access. We may collect basic, privacy-respecting analytics about site usage.</p>
        </Clause>

        <Clause title="Why we use it">
          <p>To create and secure your account, deliver the reports you&apos;re entitled to, process subscriptions, provide support, and comply with legal obligations. Our lawful bases are performance of a contract and our legitimate interest in running and securing the service.</p>
        </Clause>

        <Clause title="Sharing">
          <p>We share data only with the processors that run the service — authentication (Clerk), payments (Lemon Squeezy), hosting (Vercel), storage/CDN (Cloudflare) and email — each under their own terms. We do not sell your personal data.</p>
        </Clause>

        <Clause title="Cookies">
          <p>We use only the cookies needed to run the site: authentication and session cookies set by Clerk when you sign in, which are strictly necessary and need no consent. Our default traffic measurement (Vercel) is cookieless. If we enable Google Analytics it loads <b>only after you accept</b> the cookie banner — choosing Reject means no analytics cookies are set.</p>
        </Clause>

        <Clause title="Your rights">
          <p>Under UK GDPR you may access, correct, delete or port your data, and object to or restrict processing. Email us to exercise these rights. You may also complain to the Information Commissioner&apos;s Office (ICO).</p>
        </Clause>

        <Clause title="Retention & security">
          <p>We keep account data while your account is active and as required by law, then delete it. Access to paid content is protected by authentication and short-lived signed links; we apply reasonable technical and organisational security measures.</p>
        </Clause>

        <p className="mt-8 rounded-lg bg-tile p-4 text-xs text-muted-foreground">
          Template policy — confirm the processor list and retention periods with your solicitor before launch.
        </p>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEntitlement } from "@/lib/entitlements";
import { Btn, Hero, Note } from "@/components/ui";
import BuyButton from "@/components/BuyButton";
import { SITE } from "@/site.config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const ent = await getEntitlement();
  if (!ent.signedIn) redirect("/sign-in");
  const cancelling = ent.subscribed && ent.subStatus === "cancelled";
  const ends = ent.endsAt ? ent.endsAt.slice(0, 10) : null;

  return (
    <>
      <Hero
        title="Your account"
        tag={ent.subscribed ? (cancelling ? "AssetFrame Pro — cancelling" : "AssetFrame Pro, active") : "Free member"}
      />
      <div className="mx-auto max-w-3xl px-5 py-8">
        {ent.admin && (
          <Note><b>Admin.</b> You have admin access. Open the <a className="text-navy underline" href="/admin">dashboard</a>.</Note>
        )}

        {!ent.subscribed && (
          <div className="mb-6 rounded-xl border border-[#e6c88a] bg-[#fffdf5] p-5">
            <div className="text-lg font-bold text-[#9a6700]">Upgrade to Pro</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlock conditional setups, the price ladder, risk math and the full ledger on every edition.
            </p>
            <div className="mt-3"><BuyButton>Subscribe {SITE.proPrice}</BuyButton></div>
          </div>
        )}

        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-lg font-bold text-navy">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ent.subscribed
              ? cancelling
                ? `Your plan is cancelled — Pro access stays on until ${ends ?? "the end of your billing period"}, then it ends. No further charge.`
                : "Your Pro access is active. Open any edition's Snapshot or Pro report from the Reports page."
              : "Browse free Snapshots on the Reports page. Upgrade to unlock the Pro report on every edition."}
          </p>
          <div className="mt-3">
            <Btn href="/reports" variant="primary">Browse reports →</Btn>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Btn href="/account/subscription">Manage subscription</Btn>
          <span className="text-sm text-muted-foreground">
            {ent.subscribed ? "View your plan, billing and cancellation." : "View plans and upgrade."}
          </span>
        </div>
      </div>
    </>
  );
}

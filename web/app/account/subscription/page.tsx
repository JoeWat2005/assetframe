import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getEntitlement } from "@/lib/entitlements";
import { Hero } from "@/components/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import BuyButton from "@/components/BuyButton";
import CancelSubscription from "@/components/CancelSubscription";
import ResumeSubscription from "@/components/ResumeSubscription";
import { cancelMySubscription, resumeMySubscription } from "./actions";
import { SITE } from "@/site.config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Subscription" };

// LS dates look like "2026-07-13T09:00:00.000000Z" — show the date part only.
const fmtDate = (iso?: string) => (iso ? iso.slice(0, 10) : null);

export default async function SubscriptionPage({
  searchParams,
}: { searchParams: Promise<{ welcome?: string }> }) {
  const ent = await getEntitlement();
  if (!ent.signedIn) redirect("/sign-in");
  const { welcome } = await searchParams;

  // "paid" = a real Lemon Squeezy subscription. Admins get Pro comped, so ent.subscribed
  // can be true with no paid plan — bill/cancel UI keys off `paid`, never the comp.
  const paid = ent.billingActive;
  const cancelling = paid && ent.subStatus === "cancelled";
  const renews = fmtDate(ent.renewsAt);
  const ends = fmtDate(ent.endsAt);
  const canManageInApp = paid && !!ent.subscriptionId && !!process.env.LEMONSQUEEZY_API_KEY;
  // Per-subscription portal if the webhook captured it, else the universal email magic-link.
  const portalUrl = ent.portalUrl || SITE.lemonPortalUrl;
  // Admins with no paid plan see a complimentary-Pro card instead of any payment prompt.
  const compOnly = ent.admin && !paid;

  return (
    <>
      <Hero title="Subscription" tag="Manage your AssetFrame Pro plan and billing." />
      <div className="mx-auto max-w-2xl px-5 py-8">
        {welcome === "1" && (
          <div className="mb-4 rounded-xl border border-[#acdfb9] bg-[#eaffef] p-4 text-sm text-[#1a7f37]">
            <b>Welcome to AssetFrame Pro!</b> Your payment went through. If a Pro report still looks
            locked, give it a few seconds and refresh — access activates as soon as the payment confirms.
          </div>
        )}

        {compOnly ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AssetFrame Pro — complimentary</CardTitle>
              <CardDescription>{ent.email}</CardDescription>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="default">Admin</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>You have full Pro access as an admin — no subscription or payment required.</p>
              <p className="text-muted-foreground">
                Manage tiers, members, billing and content from the{" "}
                <Link className="font-semibold text-navy underline underline-offset-2" href="/admin">admin dashboard</Link>.
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href="/admin">Admin dashboard</Link></Button>
              <Button asChild variant="ghost"><Link href="/account">Back to account</Link></Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {paid ? ent.planName || "AssetFrame Pro" : "Free plan"}
              </CardTitle>
              <CardDescription>{ent.email}</CardDescription>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant={paid ? "default" : "secondary"}>
                  {paid ? (cancelling ? "Cancelling" : "Active") : "Free"}
                </Badge>
                {ent.admin && <Badge variant="outline">Admin</Badge>}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {paid ? (
                <>
                  {cancelling && ends ? (
                    <p>Your plan is cancelled — Pro access ends on <b>{ends}</b>.</p>
                  ) : renews ? (
                    <p>Renews on <b>{renews}</b> at {SITE.proPrice}.</p>
                  ) : (
                    <p>Your AssetFrame Pro plan is active.</p>
                  )}
                  <p className="text-muted-foreground">
                    Billing is handled securely by Lemon Squeezy, our merchant of record.
                  </p>
                  {ent.admin && (
                    <p className="text-muted-foreground">
                      You also have admin access, so Pro stays on even if you cancel this subscription.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  You&apos;re on the free plan — Snapshots only. Upgrade to unlock Pro reports, the
                  price ladder and the full outcome ledger on every edition.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              {!paid && <BuyButton>Subscribe {SITE.proPrice}</BuyButton>}
              {paid && (
                <Button asChild variant="outline">
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                    Billing portal
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link href="/account">Back to account</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {paid && cancelling && (
          <>
            <Separator className="my-6" />
            <h2 className="mb-1 text-base font-semibold">Changed your mind?</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Your plan is set to end{ends ? ` on ${ends}` : ""}. Resume to keep Pro and let it renew as normal.
            </p>
            {canManageInApp ? (
              <ResumeSubscription onResume={resumeMySubscription} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Open the <b>Billing portal</b> above to resume your plan.
              </p>
            )}
          </>
        )}

        {paid && !cancelling && (
          <>
            <Separator className="my-6" />
            <h2 className="mb-1 text-base font-semibold">Cancel subscription</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Cancel anytime — you keep Pro access until the end of your current billing period.
            </p>
            {canManageInApp ? (
              <CancelSubscription onCancel={cancelMySubscription} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Open the <b>Billing portal</b> above to cancel — your access continues to the end of the
                current billing period.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

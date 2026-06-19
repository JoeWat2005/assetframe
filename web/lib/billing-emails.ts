import "server-only";
import { emailShell, emailButton } from "./email";
import type { BillingEmailKind } from "./billing-state";
import { SITE } from "@/site.config";

// Transactional billing emails for the Clerk Billing lifecycle. Pure builders: they return
// { subject, html } and the webhook sends them via lib/email.sendEmail (which no-ops gracefully
// until RESEND_API_KEY + a verified RESEND_FROM are configured). The branded shell appends the
// standing compliance disclaimer, so these bodies stay focused on the billing action.

export type BillingEmailVars = {
  date?: string; // a friendly YYYY-MM-DD (trial end / renewal / access-ends date)
  price: string; // SITE.proPrice, e.g. "$9.99/month"
};

const manageUrl = `${SITE.url}/account/subscription`;
const reportsUrl = `${SITE.url}/reports`;
const p = (html: string) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">${html}</p>`;
const btn = (mt = 8) => `<div style="margin:${mt}px 0 4px;">`;

export function buildBillingEmail(
  kind: BillingEmailKind,
  vars: BillingEmailVars
): { subject: string; html: string } {
  const { date, price } = vars;

  switch (kind) {
    case "welcome":
      return {
        subject: "Welcome to AssetFrame Pro",
        html: emailShell({
          heading: "Your Pro access is live",
          bodyHtml:
            p("Thanks for subscribing to <b>AssetFrame Pro</b>. Your free trial has started — you won't be charged until " +
              (date ? `<b>${date}</b>` : "your trial ends") + ", and you can cancel any time before then at no cost.") +
            p("Pro unlocks the conditional long &amp; short setups, the price ladder, the calibrated confidence score and the full scored outcome ledger on every edition.") +
            btn() + emailButton(reportsUrl, "Open your Pro reports") + `</div>` +
            p(`<a href="${manageUrl}" style="color:#0b2545;">Manage your subscription</a> at any time.`),
        }),
      };

    case "trial_ending":
      return {
        subject: "Your AssetFrame Pro trial ends soon",
        html: emailShell({
          heading: "Your free trial is ending",
          bodyHtml:
            p("Your <b>AssetFrame Pro</b> free trial ends " + (date ? `on <b>${date}</b>` : "soon") +
              `. Unless you cancel before then, your subscription continues at <b>${price}</b> and your card is charged automatically.`) +
            p("Nothing to do if you'd like to keep Pro — your access carries on seamlessly. If Pro isn't for you, you can cancel in one click and keep access until the trial ends.") +
            btn() + emailButton(manageUrl, "Manage subscription") + `</div>`,
        }),
      };

    case "payment_failed":
      return {
        subject: "Action needed: your AssetFrame Pro payment failed",
        html: emailShell({
          heading: "We couldn't process your payment",
          bodyHtml:
            p("We weren't able to take your most recent <b>AssetFrame Pro</b> payment. Your Pro access stays on for a short grace period while we retry.") +
            p("Please update your card details to avoid losing access. It only takes a moment.") +
            btn() + emailButton(manageUrl, "Update payment method") + `</div>`,
        }),
      };

    case "cancelled":
      return {
        subject: "Your AssetFrame Pro plan is set to cancel",
        html: emailShell({
          heading: "Your subscription is cancelling",
          bodyHtml:
            p("Your <b>AssetFrame Pro</b> plan is scheduled to cancel. You'll keep full Pro access until " +
              (date ? `<b>${date}</b>` : "the end of your current billing period") + ", with no further charge after that.") +
            p("Changed your mind? You can resume any time before then, or resubscribe later — your account and track-record history stay intact.") +
            btn() + emailButton(manageUrl, "Manage subscription") + `</div>`,
        }),
      };
  }
}

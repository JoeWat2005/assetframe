"use server";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { sendEmail, emailShell } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { SITE } from "@/site.config";

export type FeedbackResult = { ok: boolean; message: string };

const CATEGORIES = ["feature", "bug", "data", "general", "other"];

// Public submission from /feedback. Anonymous is allowed; email is optional (for a reply).
// Defends with a honeypot field + length bounds; persists to the feedback table and fires a
// best-effort admin notification (no-ops until Resend is configured).
export async function submitFeedback(form: FormData): Promise<FeedbackResult> {
  // Honeypot: bots fill hidden fields. Pretend success so they don't retry.
  if (String(form.get("company") || "").trim()) return { ok: true, message: "Thanks for your feedback." };

  const message = String(form.get("message") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  let category = String(form.get("category") || "general").trim();
  if (!CATEGORIES.includes(category)) category = "general";

  if (message.length < 5) return { ok: false, message: "Please add a little more detail." };
  if (message.length > 4000) return { ok: false, message: "Please keep it under 4000 characters." };
  if (email && (!email.includes("@") || email.length > 200)) return { ok: false, message: "That email doesn't look right." };
  if (!sql) return { ok: false, message: `Feedback isn't available right now — please email ${SITE.contactEmail}.` };

  const xff = (await headers()).get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0].trim() || "local";
  const rl = await rateLimit(`feedback:${ip}`, { limit: 5, windowSec: 60 });
  if (!rl.ok) return { ok: false, message: "Too many requests, try again shortly." };

  // Per-account limit too — a signed-in user rotating IPs/VPN shouldn't be able to flood the
  // admin inbox past the per-IP burst limit. 10/hour per user.
  const { userId } = await auth();
  if (userId) {
    const rlUser = await rateLimit(`feedback:user:${userId}`, { limit: 10, windowSec: 3600 });
    if (!rlUser.ok) return { ok: false, message: "You've sent a lot of feedback recently — please try again later." };
  }

  try {
    const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
    await sql.query(
      `INSERT INTO feedback (email, clerk_user_id, category, message, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [email || null, userId || null, category, message, ua]
    );

    // Best-effort notify (ignored if email isn't configured / fails).
    const adminTo = (process.env.ADMIN_EMAILS || "").split(",")[0].trim() || SITE.contactEmail;
    await sendEmail({
      to: adminTo,
      subject: `New ${category} feedback — AssetFrame`,
      replyTo: email || undefined,
      html: emailShell({
        heading: "New feedback",
        bodyHtml:
          `<p style="margin:0 0 8px;font-size:14px;"><b>Category:</b> ${category}` +
          `${email ? ` &middot; <b>From:</b> ${email}` : ""}</p>` +
          `<p style="margin:0;white-space:pre-wrap;font-size:14px;color:#33415c;">${message
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
      }),
    }).catch(() => {});

    return { ok: true, message: "Thank you — your feedback is in. We read every submission." };
  } catch {
    return { ok: false, message: "Something went wrong saving that. Please try again or email us." };
  }
}

"use server";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { sql } from "./db";
import { sendEmail, emailShell, emailButton } from "./email";
import { rateLimit } from "./rate-limit";
import { SITE } from "@/site.config";

const BASE = SITE.url.replace(/\/$/, "");

// Follow / unfollow an instrument (by slug). Toggles: returns the resulting state so the
// button can flip without a refetch.
export async function toggleFollow(
  symbol: string,
  instrument: string
): Promise<{ ok: boolean; following: boolean; message?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, following: false, message: "Sign in to follow instruments." };
  if (!sql) return { ok: false, following: false, message: "Following is unavailable right now." };
  const sym = (symbol || "").trim().slice(0, 40);
  if (!sym) return { ok: false, following: false, message: "Invalid instrument." };
  try {
    const existing = (await sql.query(
      `SELECT 1 FROM watchlists WHERE clerk_user_id = $1 AND symbol = $2 LIMIT 1`,
      [userId, sym]
    )) as unknown[];
    if (existing.length > 0) {
      await sql.query(`DELETE FROM watchlists WHERE clerk_user_id = $1 AND symbol = $2`, [userId, sym]);
      return { ok: true, following: false };
    }
    await sql.query(
      `INSERT INTO watchlists (clerk_user_id, symbol, instrument) VALUES ($1, $2, $3)
         ON CONFLICT (clerk_user_id, symbol) DO NOTHING`,
      [userId, sym, (instrument || "").slice(0, 120)]
    );
    return { ok: true, following: true };
  } catch {
    return { ok: false, following: false, message: "Could not update — please try again." };
  }
}

// Newsletter / alerts sign-up with double opt-in (UK PECR/GDPR). Creates a pending row and
// emails a confirm link; the link flips it to confirmed.
export async function subscribeNewsletter(formData: FormData): Promise<{ ok: boolean; message: string }> {
  if (String(formData.get("company") || "").trim()) return { ok: true, message: "Thanks — check your inbox to confirm." }; // honeypot
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 200) return { ok: false, message: "Enter a valid email." };
  const xff = (await headers()).get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0].trim() || "local";
  const rl = await rateLimit(`newsletter:${ip}`, { limit: 5, windowSec: 60 });
  if (!rl.ok) return { ok: false, message: "Too many requests, try again shortly." };
  if (!sql) return { ok: false, message: "Sign-ups are unavailable right now." };
  try {
    const confirm = crypto.randomUUID();
    const unsub = crypto.randomUUID();
    const { userId } = await auth();
    await sql.query(
      `INSERT INTO subscribers (email, status, topics, clerk_user_id, confirm_token, unsub_token)
       VALUES ($1, 'pending', ARRAY['digest'], $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         status = CASE WHEN subscribers.status = 'confirmed' THEN 'confirmed' ELSE 'pending' END,
         confirm_token = EXCLUDED.confirm_token,
         clerk_user_id = COALESCE(subscribers.clerk_user_id, EXCLUDED.clerk_user_id)`,
      [email, userId || null, confirm, unsub]
    );
    const rows = (await sql.query(`SELECT status, confirm_token FROM subscribers WHERE email = $1 LIMIT 1`, [email])) as Record<string, unknown>[];
    const row = rows[0];
    if (row && String(row.status) === "confirmed") return { ok: true, message: "You're already subscribed — thanks!" };

    const confirmUrl = `${BASE}/api/subscribe/confirm?token=${String(row?.confirm_token ?? confirm)}`;
    const sent = await sendEmail({
      to: email,
      subject: "Confirm your AssetFrame subscription",
      html: emailShell({
        heading: "Confirm your subscription",
        bodyHtml:
          `<p style="font-size:14px;">Tap below to start receiving AssetFrame new-edition alerts. ` +
          `If you didn&rsquo;t request this, just ignore this email.</p>` +
          `<p style="margin-top:16px;">${emailButton(confirmUrl, "Confirm subscription")}</p>`,
        footerNote: `If the button doesn&rsquo;t work, paste this link into your browser: ${confirmUrl}`,
      }),
    });
    return sent.ok
      ? { ok: true, message: "Almost there — check your inbox to confirm." }
      : { ok: true, message: "You're on the list. We'll confirm by email shortly." };
  } catch {
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

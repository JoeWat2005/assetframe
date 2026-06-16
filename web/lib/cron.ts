import "server-only";

// Vercel Cron attaches `Authorization: Bearer $CRON_SECRET` to scheduled requests when
// CRON_SECRET is set in the project env. Fail closed: with no secret configured we reject,
// so the cron endpoint can never be triggered anonymously in production.
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

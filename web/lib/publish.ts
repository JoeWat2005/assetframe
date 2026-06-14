import { SITE } from "../site.config";

// Publish-schedule maths, kept pure (no React, no Date.now) so it's unit-testable and
// safe to run on both server and client. Everything is timezone-aware via Intl, so the
// homepage countdown targets the right instant whether the UK is on BST or GMT.

// Minutes that local time in `tz` is AHEAD of UTC at the given instant (60 in BST, 0 in GMT).
export function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const hour = p.hour === "24" ? 0 : Number(p.hour); // some envs emit "24" for midnight
  const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
  return Math.round((asUTC - date.getTime()) / 60000);
}

// The calendar Y-M-D seen in `tz` at the given instant.
export function localYMD(date: Date, tz: string): [number, number, number] {
  const dtf = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  return [Number(p.year), Number(p.month), Number(p.day)];
}

// Day of week (0=Sun … 6=Sat) seen in `tz` at the given instant.
export function localDOW(date: Date, tz: string): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

// The next publish instant at/after `now`, honouring cadence + local publish hour in `tz`.
// DST transitions happen around 01:00 local, well clear of the 06:00 publish hour, so reading
// the offset at the target hour is stable.
export function nextPublish(now: Date): Date {
  const { cadence, hourLocal, weekdayLocal, tz } = SITE.publish;
  for (let add = 0; add <= 8; add++) {
    const probe = new Date(now.getTime() + add * 86_400_000);
    if (cadence === "weekly" && localDOW(probe, tz) !== weekdayLocal) continue;
    const [y, m, d] = localYMD(probe, tz);
    const guessUTC = Date.UTC(y, m - 1, d, hourLocal, 0, 0);
    const target = guessUTC - tzOffsetMinutes(new Date(guessUTC), tz) * 60_000;
    if (target > now.getTime()) return new Date(target);
  }
  // Unreachable in practice; keeps the return type total.
  return new Date(now.getTime() + 86_400_000);
}

import { describe, it, expect } from "vitest";
import { nextPublish, tzOffsetMinutes, localDOW } from "../lib/publish";

// SITE.publish defaults (post-UTC migration): cadence "daily", tz "UTC", hourLocal 6 → a
// fixed 06:00 UTC drop, DST-free. The tzOffsetMinutes/localDOW tests below still exercise the
// generic helpers against "Europe/London" (BST ~last-Sun-March → last-Sun-Oct).

describe("tzOffsetMinutes (Europe/London)", () => {
  it("is +60 in summer (BST)", () => {
    expect(tzOffsetMinutes(new Date("2026-06-14T12:00:00Z"), "Europe/London")).toBe(60);
  });
  it("is 0 in winter (GMT)", () => {
    expect(tzOffsetMinutes(new Date("2026-01-14T12:00:00Z"), "Europe/London")).toBe(0);
  });
});

describe("localDOW (Europe/London)", () => {
  it("reads the local weekday", () => {
    // 2026-06-14 is a Sunday.
    expect(localDOW(new Date("2026-06-14T08:00:00Z"), "Europe/London")).toBe(0);
  });
});

describe("nextPublish (06:00 UTC, DST-free)", () => {
  it("targets 06:00 UTC the same day when before the drop", () => {
    const t = nextPublish(new Date("2026-06-14T04:00:00Z")); // before 06:00 UTC
    expect(t.toISOString()).toBe("2026-06-14T06:00:00.000Z");
  });

  it("rolls to tomorrow once today's 06:00 UTC has passed", () => {
    const t = nextPublish(new Date("2026-06-14T07:00:00Z")); // after 06:00 UTC
    expect(t.toISOString()).toBe("2026-06-15T06:00:00.000Z");
  });

  it("winter behaves identically — UTC has no DST", () => {
    const t = nextPublish(new Date("2026-01-14T04:00:00Z"));
    expect(t.toISOString()).toBe("2026-01-14T06:00:00.000Z");
  });

  it("always returns a strictly future instant (incl. UK DST-transition days)", () => {
    for (const iso of ["2026-03-29T05:30:00Z", "2026-10-25T05:30:00Z", "2026-12-31T23:59:00Z"]) {
      const now = new Date(iso);
      expect(nextPublish(now).getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("the target is exactly 06:00 UTC year-round", () => {
    for (const iso of ["2026-02-01T00:00:00Z", "2026-07-01T00:00:00Z"]) {
      const t = nextPublish(new Date(iso));
      const utc = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(t);
      expect(utc).toBe("06:00");
    }
  });
});

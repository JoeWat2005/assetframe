import { describe, it, expect } from "vitest";
import { nextPublish, tzOffsetMinutes, localDOW } from "../lib/publish";

// SITE.publish defaults: cadence "daily", tz "Europe/London", hourLocal 6.
// BST runs ~last-Sun-March → last-Sun-Oct (2026: Mar 29 → Oct 25).

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

describe("nextPublish (06:00 UK time, DST-aware)", () => {
  it("summer: targets 06:00 BST = 05:00 UTC the same day when before the drop", () => {
    const t = nextPublish(new Date("2026-06-14T04:00:00Z")); // 05:00 BST, before 06:00
    expect(t.toISOString()).toBe("2026-06-14T05:00:00.000Z");
  });

  it("summer: rolls to tomorrow once today's 06:00 BST has passed", () => {
    const t = nextPublish(new Date("2026-06-14T05:30:00Z")); // 06:30 BST, after the drop
    expect(t.toISOString()).toBe("2026-06-15T05:00:00.000Z");
  });

  it("winter: targets 06:00 GMT = 06:00 UTC", () => {
    const t = nextPublish(new Date("2026-01-14T04:00:00Z"));
    expect(t.toISOString()).toBe("2026-01-14T06:00:00.000Z");
  });

  it("always returns a strictly future instant (incl. the spring-forward day)", () => {
    for (const iso of ["2026-03-29T05:30:00Z", "2026-10-25T05:30:00Z", "2026-12-31T23:59:00Z"]) {
      const now = new Date(iso);
      expect(nextPublish(now).getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("the target is exactly 06:00 in London local time year-round", () => {
    for (const iso of ["2026-02-01T00:00:00Z", "2026-07-01T00:00:00Z"]) {
      const t = nextPublish(new Date(iso));
      const london = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(t);
      expect(london).toBe("06:00");
    }
  });
});

import { describe, expect, it } from "vitest";
import { localDay, streakDays } from "./streak";

describe("streakDays", () => {
  it("counts consecutive days ending today", () => {
    expect(streakDays(["2026-10-28", "2026-10-29", "2026-10-30"], "2026-10-30")).toBe(3);
  });
  it("still stands in the morning if yesterday counted", () => {
    expect(streakDays(["2026-10-28", "2026-10-29"], "2026-10-30")).toBe(2);
  });
  it("breaks on a missed day", () => {
    expect(streakDays(["2026-10-26", "2026-10-28", "2026-10-29"], "2026-10-29")).toBe(2);
    expect(streakDays(["2026-10-27"], "2026-10-30")).toBe(0);
  });
  it("crosses month ends", () => {
    expect(streakDays(["2026-09-30", "2026-10-01"], "2026-10-01")).toBe(2);
  });
});

describe("localDay", () => {
  it("uses the reader's time zone, not UTC", () => {
    // 23:30 UTC on 30 Oct is already 31 Oct in Amsterdam (UTC+1 in winter).
    expect(localDay(new Date("2026-10-30T23:30:00Z"), "Europe/Amsterdam")).toBe("2026-10-31");
    expect(localDay(new Date("2026-10-30T23:30:00Z"), "UTC")).toBe("2026-10-30");
  });
});

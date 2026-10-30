import { describe, expect, it } from "vitest";
import { adjustedScore, emptyPreferences, keepRate, nudge, preferencePrompt, tallyRatings } from "./preferences";

describe("nudge", () => {
  it("does nothing until there are enough ratings", () => {
    expect(nudge(undefined)).toBe(0);
    expect(nudge({ kept: 2, skipped: 0 })).toBe(0);
  });
  it("rewards what you keep and penalises what you skip, up to 15 points", () => {
    expect(nudge({ kept: 3, skipped: 0 })).toBe(9); // keep rate 4/5
    expect(nudge({ kept: 0, skipped: 3 })).toBe(-9);
    expect(nudge({ kept: 5, skipped: 5 })).toBe(0);
    expect(nudge({ kept: 200, skipped: 0 })).toBe(15);
  });
  it("smooths small samples", () => {
    expect(keepRate({ kept: 1, skipped: 0 })).toBeCloseTo(2 / 3);
  });
});

describe("adjustedScore", () => {
  const prefs = emptyPreferences();
  prefs.senders.set(1, { name: "Lenny", kept: 20, skipped: 0 });
  prefs.senders.set(2, { name: "Batch", kept: 0, skipped: 20 });
  prefs.sections.set("product", { kept: 20, skipped: 0 });
  prefs.sections.set("jobs", { kept: 0, skipped: 20 });

  it("adds newsletter and section, capped at ±20 and within 1–100", () => {
    expect(adjustedScore({ relevanceScore: 60, senderId: 1, section: "product" }, prefs)).toBe(80);
    expect(adjustedScore({ relevanceScore: 95, senderId: 1, section: "product" }, prefs)).toBe(100);
    expect(adjustedScore({ relevanceScore: 60, senderId: 2, section: "jobs" }, prefs)).toBe(40);
    expect(adjustedScore({ relevanceScore: 10, senderId: 2, section: "jobs" }, prefs)).toBe(1);
  });
  it("leaves unknown newsletters and sections alone", () => {
    expect(adjustedScore({ relevanceScore: 60, senderId: null, section: "watch" }, prefs)).toBe(60);
  });
});

describe("tallyRatings", () => {
  const senders = [
    { id: 1, name: "Lenny’s Newsletter", email: "lenny@substack.com" },
    { id: 2, name: null, email: "news@tldr.com" },
  ];
  const row = (rating: string, extra: Partial<Parameters<typeof tallyRatings>[0][number]> = {}) => ({
    rating, headline: `h-${rating}`, senderId: null, sourceName: null, topic: null, sectionType: "trends", ...extra,
  });

  it("counts by sender link, falling back to the newsletter name for older stories", () => {
    const p = tallyRatings([row("up", { senderId: 2 }), row("up", { sourceName: "lenny’s newsletter" }), row("down", { senderId: 1 })], senders);
    expect(p.senders.get(1)).toEqual({ name: "Lenny’s Newsletter", kept: 1, skipped: 1 });
    expect(p.senders.get(2)).toEqual({ name: "news@tldr.com", kept: 1, skipped: 0 });
  });
  it("counts a Top Story under its own topic, not under Top Stories", () => {
    const p = tallyRatings([row("up", { sectionType: "top_stories", topic: "engineering" }), row("up", { sectionType: "top_stories" })], senders);
    expect([...p.sections.keys()]).toEqual(["engineering"]);
  });
  it("ignores cleared ratings and keeps recent headlines", () => {
    const p = tallyRatings([row("none"), row("up"), row("down")], senders);
    expect(p.liked).toEqual(["h-up"]);
    expect(p.disliked).toEqual(["h-down"]);
  });
});

describe("preferencePrompt", () => {
  it("is empty before any ratings", () => {
    expect(preferencePrompt(emptyPreferences())).toBe("");
  });
  it("lists newsletters and sections with enough ratings, most kept first", () => {
    const p = emptyPreferences();
    p.senders.set(1, { name: "Lenny’s Newsletter", kept: 8, skipped: 2 });
    p.senders.set(2, { name: "The Batch", kept: 1, skipped: 5 });
    p.senders.set(3, { name: "Rare", kept: 1, skipped: 0 });
    p.sections.set("jobs", { kept: 0, skipped: 4 });
    const text = preferencePrompt(p, { jobs: "Job Openings" });
    expect(text).toContain("By newsletter: Lenny’s Newsletter kept 8 of 10; The Batch kept 1 of 6");
    expect(text).toContain("By section: Job Openings kept 0 of 4");
    expect(text).not.toContain("Rare");
  });
});

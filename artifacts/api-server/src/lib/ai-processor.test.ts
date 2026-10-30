import { describe, expect, it } from "vitest";
import { buildDigestFromStories, cleanStory, isQuotedFrom } from "./ai-processor";

const story = (headline: string, section: string, relevanceScore: number) =>
  cleanStory({ headline, section: section as never, relevanceScore, summary: "s", whyItMatters: "w" }, "");

describe("buildDigestFromStories", () => {
  const stories = [
    story("A", "engineering", 90),
    story("B", "product", 80),
    story("C", "product", 40),
    story("D", "jobs", 99),
    story("E", "how_i_ai", 95),
    story("F", "ai_software", 70),
    story("G", "trends", 60),
    story("H", "watch", 50),
  ];
  const digest = buildDigestFromStories(stories);
  const section = (t: string) => digest.sections.find((s) => s.type === t)!.stories.map((s) => s.headline);

  it("puts the five most relevant stories in Top Stories, highest first", () => {
    expect(section("top_stories")).toEqual(["A", "B", "F", "G", "H"]);
  });
  it("lists every story exactly once", () => {
    const all = digest.sections.flatMap((s) => s.stories.map((x) => x.headline));
    expect(all.sort()).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });
  it("keeps jobs and How I AI in their own sections", () => {
    expect(section("jobs")).toEqual(["D"]);
    expect(section("how_i_ai")).toEqual(["E"]);
    expect(section("product")).toEqual(["C"]);
  });
  it("titles the design's sections", () => {
    expect(digest.sections.find((s) => s.type === "product")!.title).toBe("Product & Design");
    expect(digest.sections.find((s) => s.type === "engineering")!.title).toBe("Engineering & AI");
  });
});

describe("cleanStory", () => {
  const source = "Content: The interesting surface is no longer the prompt box. It is the hand-off.";
  it("keeps a pull quote that appears in the newsletter", () => {
    expect(cleanStory({ pullQuote: "The interesting surface is no longer the prompt box." }, source).pullQuote).toBe(
      "The interesting surface is no longer the prompt box.",
    );
  });
  it("drops a pull quote the newsletter never said", () => {
    expect(cleanStory({ pullQuote: "AI will replace every product team by 2027." }, source).pullQuote).toBeNull();
  });
  it("defaults missing arrays and unknown sections", () => {
    const s = cleanStory({ headline: "x", section: "top_stories" as never, body: "nope" as never }, source);
    expect(s.body).toEqual([]);
    expect(s.takeaways).toEqual([]);
    expect(s.section).toBe("trends");
  });
  it("matches quotes regardless of curly quotes and spacing", () => {
    expect(isQuotedFrom("“It is  the hand-off.”", source)).toBe(true);
  });
});

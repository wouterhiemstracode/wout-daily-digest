import type { Story, DigestSection } from "@workspace/api-client-react";

/*
 * Each digest section gets a pastel tint plus a dark text colour of the same hue
 * (values in index.css). Sections without their own hue fall back to sand + ink 2.
 */
const SECTION_HUE: Record<string, "top" | "ai" | "product" | "eng" | "jobs"> = {
  top_stories: "top",
  funding_ipos: "top",
  how_i_ai: "ai",
  trends: "product",
  product: "product",
  ai_software: "eng",
  engineering: "eng",
  jobs: "jobs",
};

export function sectionColour(sectionType?: string | null) {
  const hue = sectionType && SECTION_HUE[sectionType];
  return hue ? `var(--sec-${hue})` : "var(--ink-2)";
}

/** The soft tint behind a section's tag or tile. */
export function sectionTint(sectionType?: string | null) {
  const hue = sectionType && SECTION_HUE[sectionType];
  return hue ? `var(--sec-${hue}-soft)` : "var(--paper-sunk)";
}

/** WCAG relative luminance contrast between two hex colours. */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const h = hex.replace("#", "").trim();
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * A story with its section attached. `body` and `pullQuote` are not sent by the API yet;
 * the reading view uses them when present and falls back to the briefing text otherwise.
 */
export type EditionStory = Story & { sectionType: string; sectionTitle: string; body?: string[]; pullQuote?: string };

export function flattenStories(sections: DigestSection[] | undefined): EditionStory[] {
  return (sections ?? []).flatMap((s) =>
    s.stories.map((story) => ({ ...story, sectionType: s.sectionType, sectionTitle: s.title })),
  );
}

/** Today's queue: every story once, even when it appears in Top Stories and its own section. */
export function uniqueStories(stories: EditionStory[]) {
  const seen = new Set<string>();
  return stories.filter((s) => {
    const key = `${s.headline}|${s.sourceName ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function readMinutes(story: EditionStory) {
  const text = [...(story.body ?? [story.summary, story.whyItMatters]), ...(story.takeaways ?? [])];
  const words = text.join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(words / 230) + 1);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function storyHref(digestId: number, story: { id: number }) {
  return `/story/${digestId}/${story.id}`;
}

import { db, storiesTable, digestSectionsTable, sendersTable, eq, gte, desc, and, isNotNull } from "@workspace/db";

/*
 * What wout.daily has learned from keep (up) and skip (down): how often you keep stories
 * from each newsletter and each section. It is told to the model, and it nudges scores
 * so the effect doesn't depend on the model following the hint.
 */

export const LEARNING_WINDOW_DAYS = 90;
/** A newsletter or section needs this many ratings before it moves scores. */
export const MIN_RATINGS = 3;
const MAX_NUDGE_EACH = 15;
const MAX_NUDGE_TOTAL = 20;

export interface Tally {
  kept: number;
  skipped: number;
}

export interface Preferences {
  senders: Map<number, Tally & { name: string }>;
  sections: Map<string, Tally>;
  liked: string[];
  disliked: string[];
}

export const emptyPreferences = (): Preferences => ({ senders: new Map(), sections: new Map(), liked: [], disliked: [] });

/** Keep rate with one imaginary keep and skip added, so 1 of 1 doesn't read as 100%. */
export function keepRate({ kept, skipped }: Tally) {
  return (kept + 1) / (kept + skipped + 2);
}

/** Points to add to a story's relevance for one tally: from -15 (always skipped) to +15 (always kept). */
export function nudge(t: Tally | undefined) {
  if (!t || t.kept + t.skipped < MIN_RATINGS) return 0;
  return Math.round(Math.max(-1, Math.min(1, (keepRate(t) - 0.5) * 2)) * MAX_NUDGE_EACH);
}

/** A story's relevance after your newsletter and section history, kept within 1–100. */
export function adjustedScore(
  story: { relevanceScore: number; senderId: number | null; section: string },
  prefs: Preferences,
) {
  const total = nudge(story.senderId === null ? undefined : prefs.senders.get(story.senderId)) + nudge(prefs.sections.get(story.section));
  const bounded = Math.max(-MAX_NUDGE_TOTAL, Math.min(MAX_NUDGE_TOTAL, total));
  return Math.max(1, Math.min(100, Math.round(story.relevanceScore + bounded)));
}

const pct = (t: Tally) => `kept ${t.kept} of ${t.kept + t.skipped}`;

/** The learned preferences as a block for the system prompt; empty when there is nothing yet. */
export function preferencePrompt(prefs: Preferences, sectionTitles: Record<string, string> = {}) {
  const enough = <T extends Tally>(entries: [string, T][]) =>
    entries
      .filter(([, t]) => t.kept + t.skipped >= MIN_RATINGS)
      .sort((a, b) => keepRate(b[1]) - keepRate(a[1]) || a[0].localeCompare(b[0]));
  const senders = enough([...prefs.senders.values()].map((t) => [t.name, t] as [string, Tally]));
  const sections = enough([...prefs.sections.entries()]);
  if (!senders.length && !sections.length && !prefs.liked.length && !prefs.disliked.length) return "";

  const lines = [`LEARNED PREFERENCES (from Wout's keeps and skips in the last ${LEARNING_WINDOW_DAYS} days; use them to set relevanceScore):`];
  if (senders.length) lines.push(`- By newsletter: ${senders.map(([n, t]) => `${n} ${pct(t)}`).join("; ")}`);
  if (sections.length) lines.push(`- By section: ${sections.map(([s, t]) => `${sectionTitles[s] ?? s} ${pct(t)}`).join("; ")}`);
  if (prefs.liked.length) lines.push(`- Recently kept: ${prefs.liked.join(" | ")}`);
  if (prefs.disliked.length) lines.push(`- Recently skipped: ${prefs.disliked.join(" | ")}`);
  lines.push("Score stories like the ones he keeps higher, and the kind he skips lower. Don't drop a strong story only because its newsletter is often skipped.");
  return lines.join("\n");
}

type Rated = {
  rating: string;
  headline: string;
  senderId: number | null;
  sourceName: string | null;
  topic: string | null;
  sectionType: string;
};

/** Tally rated stories. Older stories without a sender link are matched by newsletter name. */
export function tallyRatings(rows: Rated[], senders: { id: number; name: string | null; email: string }[]): Preferences {
  const prefs = emptyPreferences();
  const byName = new Map(senders.filter((s) => s.name).map((s) => [s.name!.toLowerCase(), s.id]));
  const nameOf = new Map(senders.map((s) => [s.id, s.name ?? s.email]));
  const bump = (t: Tally, rating: string) => (rating === "up" ? t.kept++ : t.skipped++);

  for (const r of rows) {
    if (r.rating !== "up" && r.rating !== "down") continue;
    const senderId = r.senderId ?? (r.sourceName ? byName.get(r.sourceName.toLowerCase()) : undefined);
    if (senderId !== undefined && nameOf.has(senderId)) {
      const t = prefs.senders.get(senderId) ?? { kept: 0, skipped: 0, name: nameOf.get(senderId)! };
      bump(t, r.rating);
      prefs.senders.set(senderId, t);
    }
    const section = r.topic ?? r.sectionType;
    if (section !== "top_stories") {
      const t = prefs.sections.get(section) ?? { kept: 0, skipped: 0 };
      bump(t, r.rating);
      prefs.sections.set(section, t);
    }
    const list = r.rating === "up" ? prefs.liked : prefs.disliked;
    if (list.length < 30) list.push(r.headline);
  }
  return prefs;
}

/** Your ratings from the last 90 days, newest first. */
export async function loadPreferences(): Promise<Preferences> {
  const since = new Date(Date.now() - LEARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      rating: storiesTable.userFeedback,
      headline: storiesTable.headline,
      senderId: storiesTable.senderId,
      sourceName: storiesTable.sourceName,
      topic: storiesTable.topic,
      sectionType: digestSectionsTable.sectionType,
    })
    .from(storiesTable)
    .innerJoin(digestSectionsTable, eq(storiesTable.sectionId, digestSectionsTable.id))
    .where(and(isNotNull(storiesTable.userFeedback), gte(storiesTable.createdAt, since)))
    .orderBy(desc(storiesTable.createdAt));
  const senders = await db.select({ id: sendersTable.id, name: sendersTable.name, email: sendersTable.email }).from(sendersTable);
  return tallyRatings(rows as Rated[], senders);
}

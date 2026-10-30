import type { Logger } from "pino";
import {
  db,
  emailsTable,
  sendersTable,
  digestsTable,
  digestSectionsTable,
  storiesTable,
  eq,
  desc,
  gte,
  inArray,
} from "@workspace/db";
import { processEmailsIntoDigest, type EmailContent } from "./ai-processor";
import { loadPreferences } from "./preferences";
import { discoverNewsletters, fetchEmailsForSender, fetchMessage, getGmailStatus, type GmailMessage, type NewsletterRef } from "./gmail";

/*
 * The two steps of a briefing, shared by the API routes and the daily job:
 * check Gmail for newsletters, then write a digest from them.
 */

export class GmailNotConnectedError extends Error {
  constructor() {
    super("Gmail not connected");
  }
}

/** Scan the inbox, add newly found newsletter senders, and store new newsletters. */
export async function syncNewsletters(log: Logger) {
  const status = await getGmailStatus();
  if (!status.connected) throw new GmailNotConnectedError();

  const errors: string[] = [];

  // 1. Find newsletters in the inbox and add any sender we haven't seen yet.
  let found: NewsletterRef[] = [];
  try {
    found = await discoverNewsletters(24);
  } catch (err: any) {
    log.error({ err }, "Newsletter discovery failed");
    errors.push(`Inbox scan: ${err.message ?? "Unknown error"}`);
  }
  const known = new Set((await db.select({ email: sendersTable.email }).from(sendersTable)).map((s) => s.email));
  const fresh = new Map<string, string | null>();
  for (const ref of found) if (!known.has(ref.email) && !fresh.has(ref.email)) fresh.set(ref.email, ref.name);
  if (fresh.size > 0) {
    await db
      .insert(sendersTable)
      .values([...fresh].map(([email, name]) => ({ email, name, autoDetected: true })))
      .onConflictDoNothing({ target: sendersTable.email });
  }

  // 2. Store new messages from every sender that is switched on.
  const active = await db.select().from(sendersTable).where(eq(sendersTable.active, true));
  const senderByEmail = new Map(active.map((s) => [s.email, s]));
  const stored = new Set(
    found.length
      ? (await db.select({ id: emailsTable.gmailMessageId }).from(emailsTable).where(inArray(emailsTable.gmailMessageId, found.map((f) => f.id)))).map((r) => r.id)
      : [],
  );

  let fetched = 0;
  const save = async (senderId: number, msg: GmailMessage) => {
    const inserted = await db
      .insert(emailsTable)
      .values({
        senderId,
        gmailMessageId: msg.id,
        subject: msg.subject,
        bodyText: msg.bodyText,
        bodyHtml: msg.bodyHtml,
        receivedAt: msg.receivedAt,
        processed: false,
      })
      .onConflictDoNothing({ target: emailsTable.gmailMessageId })
      .returning({ id: emailsTable.id });
    fetched += inserted.length;
  };

  for (const ref of found) {
    const sender = senderByEmail.get(ref.email);
    if (!sender || stored.has(ref.id)) continue;
    const msg = await fetchMessage(ref.id);
    if (msg) await save(sender.id, msg);
  }

  // Senders added by hand may not send list mail, so they are fetched by address too.
  for (const sender of active.filter((s) => !s.autoDetected)) {
    try {
      for (const msg of await fetchEmailsForSender(sender.email, 24)) await save(sender.id, msg);
    } catch (err: any) {
      log.error({ err, sender: sender.email }, "Failed to fetch emails for sender");
      errors.push(`${sender.email}: ${err.message ?? "Unknown error"}`);
    }
  }

  return { fetched, senders: active.length, discovered: fresh.size, errors };
}

/** Write a digest from the newsletters of the last `hoursBack` hours. Returns the full digest. */
export async function writeDigest(hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const emails = await db
    .select({
      senderId: emailsTable.senderId,
      senderEmail: sendersTable.email,
      subject: emailsTable.subject,
      bodyText: emailsTable.bodyText,
      bodyHtml: emailsTable.bodyHtml,
      receivedAt: emailsTable.receivedAt,
    })
    .from(emailsTable)
    .leftJoin(sendersTable, eq(emailsTable.senderId, sendersTable.id))
    .where(gte(emailsTable.receivedAt, since))
    .orderBy(desc(emailsTable.receivedAt));

  const emailContent: EmailContent[] = emails.map((e) => ({
    senderId: e.senderId,
    senderEmail: e.senderEmail ?? "",
    subject: e.subject,
    bodyText: e.bodyText ?? "",
    bodyHtml: e.bodyHtml ?? "",
    receivedAt: e.receivedAt,
  }));

  const today = new Date().toISOString().split("T")[0]!;
  const [digest] = await db
    .insert(digestsTable)
    .values({ date: today, status: "draft" })
    .returning();

  try {
    const output = await processEmailsIntoDigest(emailContent, await loadPreferences());

    await db.update(digestsTable).set({ intro: output.intro || null }).where(eq(digestsTable.id, digest!.id));

    for (let i = 0; i < output.sections.length; i++) {
      const section = output.sections[i]!;
      if (section.stories.length === 0) continue;

      const [sec] = await db
        .insert(digestSectionsTable)
        .values({
          digestId: digest!.id,
          sectionType: section.type,
          title: section.title,
          sortOrder: i,
        })
        .returning();

      for (let j = 0; j < section.stories.length; j++) {
        const story = section.stories[j]!;
        await db.insert(storiesTable).values({
          sectionId: sec!.id,
          headline: story.headline,
          summary: story.summary,
          whyItMatters: story.whyItMatters,
          takeaways: story.takeaways ?? [],
          body: story.body,
          pullQuote: story.pullQuote,
          senderId: story.senderId,
          topic: story.section,
          sourceUrl: story.sourceUrl,
          sourceName: story.sourceName,
          relevanceScore: story.relevanceScore,
          sortOrder: j,
        });
      }
    }

    await db.update(digestsTable).set({ status: "ready" }).where(eq(digestsTable.id, digest!.id));

    await db
      .update(emailsTable)
      .set({ processed: true })
      .where(gte(emailsTable.receivedAt, since));

  } catch (err) {
    await db.update(digestsTable).set({ status: "error" }).where(eq(digestsTable.id, digest!.id));
    throw err;
  }

  return buildFullDigest(digest!.id);
}

export async function buildFullDigest(digestId: number) {
  const [digest] = await db.select().from(digestsTable).where(eq(digestsTable.id, digestId));
  if (!digest) throw new Error("Digest not found");

  const sections = await db
    .select()
    .from(digestSectionsTable)
    .where(eq(digestSectionsTable.digestId, digestId))
    .orderBy(digestSectionsTable.sortOrder);

  const fullSections = await Promise.all(
    sections.map(async (sec) => {
      const stories = await db
        .select()
        .from(storiesTable)
        .where(eq(storiesTable.sectionId, sec.id))
        .orderBy(storiesTable.sortOrder);

      return {
        id: sec.id,
        digestId: sec.digestId,
        sectionType: sec.sectionType,
        title: sec.title,
        sortOrder: sec.sortOrder,
        stories: stories.map((s) => ({
          id: s.id,
          sectionId: s.sectionId,
          headline: s.headline,
          summary: s.summary,
          whyItMatters: s.whyItMatters,
          takeaways: (s.takeaways as string[]) ?? [],
          sourceUrl: s.sourceUrl,
          sourceName: s.sourceName,
          relevanceScore: s.relevanceScore,
          sortOrder: s.sortOrder,
          userFeedback: s.userFeedback,
          body: (s.body as string[]) ?? [],
          pullQuote: s.pullQuote,
        })),
      };
    })
  );

  const storyCount = fullSections.reduce((sum, s) => sum + s.stories.length, 0);

  return {
    id: digest.id,
    date: digest.date,
    status: digest.status,
    storyCount,
    intro: digest.intro ?? null,
    createdAt: digest.createdAt.toISOString(),
    sections: fullSections,
  };
}

/** The morning run: check Gmail, then write a briefing if new newsletters arrived. */
export async function runDaily(log: Logger) {
  const synced = await syncNewsletters(log);
  log.info(synced, "Inbox checked");
  if (synced.fetched === 0) {
    log.info("No new newsletters since the last run; no briefing today");
    return { ...synced, digestId: null as number | null };
  }
  const digest = await writeDigest(24);
  log.info({ digestId: digest.id, stories: digest.storyCount }, "Briefing written");
  return { ...synced, digestId: digest.id as number | null };
}

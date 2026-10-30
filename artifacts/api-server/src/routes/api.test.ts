import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/*
 * The whole flow against a real Postgres (TEST_DATABASE_URL): sync finds the newsletters in a
 * fake inbox, generate writes a digest with a fake model, and feedback rates and un-rates stories.
 */

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const INBOX = [
  { id: "m1", from: "Lenny's Newsletter <lenny@substack.com>", subject: "How AI agents become workflows", list: true,
    body: "Teams put AI into repeatable work. The interesting surface is no longer the prompt box. It is the hand-off." },
  { id: "m2", from: "The Pragmatic Engineer <pragmatic@substack.com>", subject: "Measuring developer tools", list: true,
    body: "Platform teams measure time saved, adoption and fewer interruptions." },
  { id: "m3", from: "Shop <orders@shop.com>", subject: "Your order has shipped", list: true, body: "Track your parcel." },
  { id: "m4", from: "Anna <anna@example.com>", subject: "Lunch tomorrow?", list: false, body: "Noon?" },
  { id: "m5", from: "Muted Weekly <muted@example.com>", subject: "This week in muted", list: true, body: "Muted content." },
];

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    async proxy(_service: string, path: string) {
      const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
      if (path.endsWith("/profile")) return json({ emailAddress: "wout@example.com" });
      if (path.includes("/messages?")) {
        const q = decodeURIComponent(path.split("q=")[1]!.split("&")[0]!);
        const from = q.match(/from:(\S+)/)?.[1];
        const ids = INBOX.filter((m) => !from || m.from.includes(from)).map((m) => ({ id: m.id }));
        return json({ messages: ids });
      }
      const m = INBOX.find((x) => path.includes(`/messages/${x.id}?`))!;
      const headers = [
        { name: "From", value: m.from },
        { name: "Subject", value: m.subject },
        { name: "Date", value: new Date().toUTCString() },
        ...(m.list ? [{ name: "List-Unsubscribe", value: "<https://example.com/u>" }] : []),
      ];
      return json({ payload: { headers, mimeType: "text/plain", body: { data: b64(m.body) } } });
    }
  },
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify({
            intro: "Good evening. Two stories tonight.",
            stories: [
              { headline: "AI agents are becoming a workflow", summary: "s1", whyItMatters: "w1", takeaways: ["t1"],
                body: ["Paragraph one.", "Paragraph two."], pullQuote: "The interesting surface is no longer the prompt box.",
                sourceName: "Lenny's Newsletter", sourceUrl: null, relevanceScore: 90, section: "product" },
              { headline: "What platform teams measure", summary: "s2", whyItMatters: "w2", takeaways: [],
                body: ["Only paragraph."], pullQuote: "Made-up words nobody wrote down.",
                sourceName: "The Pragmatic Engineer", sourceUrl: null, relevanceScore: 70, section: "engineering" },
              { headline: "Senior Product Designer", summary: "s3", whyItMatters: "w3", takeaways: [], body: [],
                pullQuote: null, sourceName: "Lenny's Newsletter", sourceUrl: null, relevanceScore: 60, section: "jobs" },
            ],
          }) } }],
        }),
      },
    },
  },
}));

const enabled = !!process.env["TEST_DATABASE_URL"];

describe.skipIf(!enabled)("api (needs TEST_DATABASE_URL)", async () => {
  const request = (await import("supertest")).default;
  const app = (await import("../app")).default;
  const { db, pool, sendersTable } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const api = request(app);

  beforeAll(async () => {
    await db.execute(sql`truncate senders, emails, digests, feedback restart identity cascade`);
    await db.insert(sendersTable).values({ email: "muted@example.com", name: "Muted Weekly", active: false, autoDetected: true });
  });
  afterAll(() => pool.end());

  let mutedId = 0;

  it("sync finds the newsletters and adds their senders", async () => {
    const res = await api.post("/api/emails/sync").expect(200);
    expect(res.body).toMatchObject({ fetched: 2, discovered: 2, errors: [] });

    const senders = (await api.get("/api/senders").expect(200)).body as any[];
    expect(senders.map((s) => s.email).sort()).toEqual(["lenny@substack.com", "muted@example.com", "pragmatic@substack.com"]);
    expect(senders.find((s) => s.email === "lenny@substack.com")).toMatchObject({ name: "Lenny's Newsletter", active: true, autoDetected: true, emailCount: 1 });
    const muted = senders.find((s) => s.email === "muted@example.com");
    expect(muted).toMatchObject({ active: false, emailCount: 0 });
    mutedId = muted.id;
  });

  it("a second sync stores nothing twice and keeps muted senders off", async () => {
    const res = await api.post("/api/emails/sync").expect(200);
    expect(res.body).toMatchObject({ fetched: 0, discovered: 0 });
    const senders = (await api.get("/api/senders")).body as any[];
    expect(senders.find((s) => s.id === mutedId).active).toBe(false);
  });

  it("switching a sender back on brings its newsletter in", async () => {
    const patched = await api.patch(`/api/senders/${mutedId}`).send({ active: true }).expect(200);
    expect(patched.body).toMatchObject({ active: true, autoDetected: true });
    expect((await api.post("/api/emails/sync")).body.fetched).toBe(1);
    await api.patch("/api/senders/99999").send({ active: true }).expect(404);
    await api.patch(`/api/senders/${mutedId}`).send({ active: "yes" }).expect(400);
  });

  let storyId = 0;

  it("generate writes a digest where each story appears once, with its full text", async () => {
    const res = await api.post("/api/digests/generate").send({}).expect(200);
    const sections = res.body.sections as any[];
    expect(sections.map((s) => s.sectionType)).toEqual(["top_stories", "jobs"]);
    const stories = sections.flatMap((s) => s.stories);
    expect(stories.map((s: any) => s.headline)).toEqual(["AI agents are becoming a workflow", "What platform teams measure", "Senior Product Designer"]);

    const lead = stories[0];
    expect(lead.body).toEqual(["Paragraph one.", "Paragraph two."]);
    expect(lead.pullQuote).toBe("The interesting surface is no longer the prompt box.");
    expect(stories[1].pullQuote).toBeNull(); // not in the newsletter, so dropped
    storyId = lead.id;

    const latest = await api.get("/api/digests/latest").expect(200);
    expect(latest.body.id).toBe(res.body.id);
    expect(latest.body.storyCount).toBe(3);
  });

  it("feedback rates a story and 'none' clears it again", async () => {
    const rating = async () =>
      ((await api.get("/api/digests/latest")).body.sections as any[]).flatMap((s) => s.stories).find((s: any) => s.id === storyId).userFeedback;

    await api.post("/api/feedback").send({ storyId, rating: "up" }).expect(201);
    expect(await rating()).toBe("up");
    await api.post("/api/feedback").send({ storyId, rating: "none" }).expect(201);
    expect(await rating()).toBeNull();
    await api.post("/api/feedback").send({ storyId, rating: "maybe" }).expect(400);
  });
});

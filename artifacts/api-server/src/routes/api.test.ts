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

// Google's OAuth and Gmail endpoints, answered in-process. Access tokens: "at-wout" and its
// refreshed successor "at-wout-2" belong to the allowed account; "at-stranger" to someone else.
const google = { refreshes: 0 };
const realFetch = globalThis.fetch;
vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
  const bearer = new Headers(init?.headers).get("authorization")?.replace("Bearer ", "");

  if (url.host === "oauth2.googleapis.com") {
    const form = new URLSearchParams(String(init?.body));
    if (form.get("grant_type") === "refresh_token") {
      google.refreshes++;
      return json({ access_token: "at-wout-2", expires_in: 3600 });
    }
    const gmail = "openid email https://www.googleapis.com/auth/gmail.readonly";
    const byCode: Record<string, object> = {
      wout: { access_token: "at-wout", refresh_token: "rt-wout", expires_in: 3600, scope: gmail },
      stranger: { access_token: "at-stranger", refresh_token: "rt-x", expires_in: 3600, scope: gmail },
    };
    return byCode[form.get("code")!] ? json(byCode[form.get("code")!]) : json({ error: "invalid_grant" }, 400);
  }
  if (url.host === "openidconnect.googleapis.com") {
    const email = bearer === "at-stranger" ? "stranger@example.com" : "Wout@Example.com";
    return json({ email, email_verified: true });
  }
  if (url.host === "gmail.googleapis.com") {
    if (bearer !== "at-wout" && bearer !== "at-wout-2") return json({ error: "unauthorized" }, 401);
    const path = url.pathname + url.search;
    if (url.pathname.endsWith("/messages")) {
      const from = url.searchParams.get("q")!.match(/from:(\S+)/)?.[1];
      return json({ messages: INBOX.filter((m) => !from || m.from.includes(from)).map((m) => ({ id: m.id })) });
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
  return realFetch(input, init);
});

// Claude, as the SDK's beta stream returns it once the structured output is parsed.
const claude = { requests: [] as any[] };
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = {
      messages: {
        stream: (params: unknown) => {
          claude.requests.push(params);
          return {
            finalMessage: async () => ({
              model: "claude-opus-5-5",
              stop_reason: "end_turn",
              usage: {},
              parsed_output: {
                intro: "Good evening. Two stories tonight.",
                stories: [
                  { headline: "AI agents are becoming a workflow", summary: "s1", whyItMatters: "w1", takeaways: ["t1"],
                    body: ["Paragraph one.", "Paragraph two."], pullQuote: "The interesting surface is no longer the prompt box.",
                    sourceName: "Lenny's Newsletter", fromEmail: "lenny@substack.com", sourceUrl: null, relevanceScore: 90, section: "product" },
                  { headline: "What platform teams measure", summary: "s2", whyItMatters: "w2", takeaways: [],
                    body: ["Only paragraph."], pullQuote: "Made-up words nobody wrote down.",
                    sourceName: "The Pragmatic Engineer", fromEmail: "pragmatic@substack.com", sourceUrl: null, relevanceScore: 70, section: "engineering" },
                  { headline: "Senior Product Designer", summary: "s3", whyItMatters: "w3", takeaways: [], body: [],
                    pullQuote: null, sourceName: "Lenny's Newsletter", fromEmail: "LENNY@substack.com", sourceUrl: null, relevanceScore: 60, section: "jobs" },
                ],
              },
            }),
          };
        },
      },
    };
  },
}));

const enabled = !!process.env["TEST_DATABASE_URL"];

describe.skipIf(!enabled)("api (needs TEST_DATABASE_URL)", async () => {
  const request = (await import("supertest")).default;
  const app = (await import("../app")).default;
  const { db, pool, sendersTable, gmailTokensTable, sql } = await import("@workspace/db");
  const api = request.agent(app); // keeps the session cookie between requests

  /** Run the Google sign-in redirects as a browser would; returns where it lands. */
  const signIn = async (agent: ReturnType<typeof request.agent>, code: string, tamper = false) => {
    const start = await agent.get("/api/auth/google/start").expect(302);
    const state = new URL(start.headers["location"]).searchParams.get("state")!;
    const done = await agent.get(`/api/auth/google/callback?code=${code}&state=${tamper ? "forged" : state}`).expect(302);
    return done.headers["location"];
  };

  beforeAll(async () => {
    // A blank database migrated exactly as production does it.
    await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public`);
    const { migrateDatabase } = await import("@workspace/db/migrate");
    await migrateDatabase(new URL("../../../../lib/db/migrations", import.meta.url).pathname);
    await db.insert(sendersTable).values({ email: "muted@example.com", name: "Muted Weekly", active: false, autoDetected: true });
  });
  afterAll(() => pool.end());

  let mutedId = 0;

  it("everything but sign-in and health needs a session", async () => {
    await request(app).get("/api/healthz").expect(200);
    await request(app).get("/api/digests/latest").expect(401);
    await request(app).post("/api/emails/sync").expect(401);
    const start = await request(app).get("/api/auth/google/start").expect(302);
    const consent = new URL(start.headers["location"]);
    expect(consent.host).toBe("accounts.google.com");
    expect(consent.searchParams.get("scope")).toContain("gmail.readonly");
    expect(consent.searchParams.get("redirect_uri")).toBe("http://localhost:8080/api/auth/google/callback");
  });

  it("someone not in ALLOWED_EMAILS can't sign in, and their Gmail isn't stored", async () => {
    const stranger = request.agent(app);
    expect(await signIn(stranger, "stranger")).toBe("/?signin=denied");
    await stranger.get("/api/auth/me").expect(401);
    expect(await db.select().from(gmailTokensTable)).toEqual([]);
  });

  it("a forged OAuth state is rejected", async () => {
    expect(await signIn(request.agent(app), "wout", true)).toBe("/?signin=failed");
  });

  it("signing in with Google connects Gmail too", async () => {
    expect(await signIn(api, "wout")).toBe("/");
    expect((await api.get("/api/auth/me").expect(200)).body).toEqual({ email: "wout@example.com" });
    expect((await api.get("/api/auth/gmail/status").expect(200)).body).toEqual({ connected: true, email: "wout@example.com" });
  });

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

    const [req] = claude.requests;
    expect(req).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(req.messages[0].content).toContain("The interesting surface is no longer the prompt box.");

    const lead = stories[0];
    expect(lead.body).toEqual(["Paragraph one.", "Paragraph two."]);
    expect(lead.pullQuote).toBe("The interesting surface is no longer the prompt box.");
    expect(stories[1].pullQuote).toBeNull(); // not in the newsletter, so dropped
    storyId = lead.id;

    const latest = await api.get("/api/digests/latest").expect(200);
    expect(latest.body.id).toBe(res.body.id);
    expect(latest.body.storyCount).toBe(3);
  });

  it("an expired Gmail token is refreshed", async () => {
    await db.update(gmailTokensTable).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await api.get("/api/auth/gmail/status")).body.connected).toBe(true);
    expect(google.refreshes).toBe(1);
    expect((await db.select().from(gmailTokensTable))[0]!.accessToken).toBe("at-wout-2");
  });

  it("the morning job needs its secret, then checks Gmail and writes a briefing only when something new arrived", async () => {
    await request(app).post("/api/jobs/daily").expect(401);
    await request(app).post("/api/jobs/daily").set("x-cron-secret", "wrong-secret").expect(401);
    const run = await request(app).post("/api/jobs/daily").set("x-cron-secret", "cron-secret").expect(200);
    expect(run.body).toMatchObject({ fetched: 0, digestId: null }); // everything was already synced
  });

  it("webhooks need their secret, not a session", async () => {
    await request(app).post("/api/webhooks/funding").send([{ company: "Acme" }]).expect(401);
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

  it("learns from keeps and skips: per newsletter and section, in the prompt and the scores", async () => {
    // Three editions where every Lenny story is kept and every Pragmatic Engineer story skipped.
    for (let i = 0; i < 3; i++) {
      const digest = (await api.post("/api/digests/generate").send({}).expect(200)).body;
      for (const story of (digest.sections as any[]).flatMap((s) => s.stories)) {
        const rating = story.sourceName === "Lenny's Newsletter" ? "up" : "down";
        await api.post("/api/feedback").send({ storyId: story.id, rating }).expect(201);
      }
    }

    const next = (await api.post("/api/digests/generate").send({}).expect(200)).body;
    const system = claude.requests.at(-1).system as string;
    expect(system).toContain("By newsletter: Lenny's Newsletter kept 6 of 6; The Pragmatic Engineer kept 0 of 3");
    expect(system).toContain("By section: Job Openings kept 3 of 3; Product & Design kept 3 of 3; Engineering & AI kept 0 of 3");

    // The model scored them 90 / 70 / 60; history moves them by up to ±20.
    const scores = Object.fromEntries((next.sections as any[]).flatMap((s) => s.stories).map((s: any) => [s.headline, s.relevanceScore]));
    expect(scores).toEqual({ "AI agents are becoming a workflow": 100, "What platform teams measure": 52, "Senior Product Designer": 80 });

    const senders = (await api.get("/api/senders").expect(200)).body as any[];
    expect(senders.find((s) => s.email === "lenny@substack.com")).toMatchObject({ kept: 6, skipped: 0 });
    expect(senders.find((s) => s.email === "pragmatic@substack.com")).toMatchObject({ kept: 0, skipped: 3 });
  });

  it("signing out ends the session", async () => {
    await api.post("/api/auth/signout").expect(200);
    await api.get("/api/digests/latest").expect(401);
  });
});

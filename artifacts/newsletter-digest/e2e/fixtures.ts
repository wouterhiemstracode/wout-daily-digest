import type { Page } from "@playwright/test";
import type { Digest, Sender } from "@workspace/api-client-react";
import { demoEdition, demoSenders } from "../../../scripts/src/demo-edition";

/** The demo edition as GET /api/digests/latest returns it. */
export function demoDigest(): Digest {
  let storyId = 100;
  return {
    id: 1,
    date: "2026-10-29",
    status: "ready",
    intro: demoEdition.intro,
    createdAt: "2026-10-29T18:00:00Z",
    storyCount: demoEdition.sections.reduce((n, s) => n + s.stories.length, 0),
    sections: demoEdition.sections.map((s, i) => ({
      id: 10 + i,
      digestId: 1,
      sectionType: s.type,
      title: s.title,
      sortOrder: i,
      stories: s.stories.map((st, j) => ({ ...st, id: storyId++, sectionId: 10 + i, sortOrder: j, userFeedback: null })),
    })),
  };
}

export const LEAD_ID = 100;

export function demoSenderList(): Sender[] {
  return demoSenders.map((s, i) => ({
    id: i + 1,
    ...s,
    active: i !== 5,
    autoDetected: i !== 4,
    emailCount: 6 - i,
    createdAt: "2026-10-01T08:00:00Z",
  }));
}

export interface ApiLog {
  feedback: { storyId: number; rating: string }[];
  senderUpdates: { id: number; active: boolean }[];
  syncs: number;
  generates: number;
}

/** Answer /api/* like the real server does, and record what the page sent. */
export async function mockApi(page: Page, opts: { digest?: Digest | null; connected?: boolean; signedIn?: boolean } = {}) {
  const digest = opts.digest === undefined ? demoDigest() : opts.digest;
  const senders = demoSenderList();
  const log: ApiLog = { feedback: [], senderUpdates: [], syncs: 0, generates: 0 };

  await page.clock.setFixedTime(new Date("2026-10-29T20:30:00+01:00"));
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, "");
    const method = req.method();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (opts.signedIn === false && path !== "/healthz") return json({ error: "Sign in required" }, 401);
    if (path === "/auth/me") return json({ email: "wout@example.com" });
    if (path === "/auth/signout") return json({ success: true });
    if (path === "/auth/gmail/status") return json({ connected: opts.connected ?? true, email: "wout@example.com" });
    if (path === "/auth/gmail/url") return json({ url: "#" });
    if (path === "/senders" && method === "GET") return json(senders);
    const sender = path.match(/^\/senders\/(\d+)$/);
    if (sender && method === "PATCH") {
      const s = senders.find((x) => x.id === Number(sender[1]))!;
      s.active = req.postDataJSON().active;
      log.senderUpdates.push({ id: s.id, active: s.active });
      return json(s);
    }
    if (path === "/digests/latest") return digest ? json(digest) : json({ error: "No digest found" }, 404);
    if (path.startsWith("/digests/") && method === "GET") return digest ? json(digest) : json({ error: "Not found" }, 404);
    if (path === "/digests") return json(digest ? [{ ...digest, sections: undefined }] : []);
    if (path === "/feedback") {
      const body = req.postDataJSON();
      log.feedback.push(body);
      return json({ id: log.feedback.length, ...body, createdAt: new Date().toISOString() }, 201);
    }
    if (path === "/emails/sync") {
      log.syncs++;
      return json({ fetched: 4, senders: 6, discovered: 1, errors: [] });
    }
    if (path === "/digests/generate") {
      log.generates++;
      return json(demoDigest());
    }
    return json({ error: `not mocked: ${method} ${path}` }, 404);
  });
  return log;
}

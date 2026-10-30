# wout.daily

Your newsletters, one calm briefing. Sign in with Google, and wout.daily finds the newsletters in your Gmail, has Claude write one daily briefing from them, and lets you sort it card by card (keep / skip, swipe on a phone) into a reading list.

- **Finds newsletters by itself:** mailing-list mail (List-Unsubscribe / List-Id headers), skipping receipts, account notices, promotions and app notifications. **My sources** lists what it found, each with an on/off switch.
- **Writes the briefing** with Claude Opus 5.5: Top Stories plus sections (How I AI, Product & Design, Engineering & AI, Job Openings, …), each story with full text and a pull quote that is only kept if it's verbatim in the newsletter.
- **Runs every morning** on a schedule, or whenever you tap **New briefing**.
- **Private:** only the Google accounts in `ALLOWED_EMAILS` can sign in. Gmail access is read-only.

## Run it on Railway

You need a [Railway](https://railway.com) account (about $5/month), a Google Cloud project (free), and an [Anthropic API key](https://console.anthropic.com). Claude costs roughly $0.30–0.80 per briefing, depending on how many newsletters arrived.

### 1. Google sign-in (about 10 minutes)

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a project, e.g. `wout-daily`.
2. **APIs & Services → Library**: enable the **Gmail API**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type **External**; app name `wout.daily`; your email as support and developer contact.
   - **Data access / Scopes**: add `openid`, `.../auth/userinfo.email` and `.../auth/gmail.readonly`.
   - **Audience**: add your Gmail address as a test user.
4. **Credentials → Create credentials → OAuth client ID**, type **Web application**. Leave the redirect URI for step 2.4. Keep the **client ID** and **client secret**.

> **Publishing status.** While the app is in **Testing**, Google expires the Gmail permission after 7 days, so you'd have to sign in again every week. For a personal app, set **Audience → Publish app → In production**. Google then shows "Google hasn't verified this app" once when you sign in; click **Advanced → Go to wout.daily**. Verification is only needed for apps used by other people.

### 2. Deploy

1. Railway → **New project → Deploy from GitHub repo** → `wout-daily-digest`. The repo's `railway.json` sets the build, start command, health check, and a pre-deploy step that applies the database schema.
2. In the project: **New → Database → PostgreSQL**.
3. Web service → **Settings → Networking → Generate domain**, e.g. `wout-daily.up.railway.app`.
4. Back in Google **Credentials**, edit the OAuth client and add the redirect URI:
   `https://wout-daily.up.railway.app/api/auth/google/callback`
5. Web service → **Variables**:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `APP_URL` | `https://wout-daily.up.railway.app` |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from step 1.4 |
   | `ALLOWED_EMAILS` | your Gmail address (comma-separate several) |
   | `SESSION_SECRET` | a long random string, e.g. `openssl rand -hex 32` |
   | `ANTHROPIC_API_KEY` | from console.anthropic.com |
   | `WEBHOOK_SECRET` | optional: only if you use the funding webhook |

6. Open the domain and **Sign in with Google**. That one consent screen also connects Gmail.

### 3. The morning briefing

Add a second service from the same repo for the scheduled run:

1. **New → GitHub repo** → `wout-daily-digest` again; rename it `daily`.
2. **Settings → Config-as-code → Railway config file**: `/railway/daily.json`. It runs `dist/daily.mjs` (check Gmail, then write the briefing) at **05:15 UTC**, which is 06:15 in Amsterdam in winter and 07:15 in summer. Change `cronSchedule` there to move it.
3. Give it the same variables as the web service. Easiest: make them **Shared variables** at the project level and reference them from both services.

A run with no new newsletters skips the briefing. A failed run shows as failed in the service's deployments.

### 4. Bring your data from Replit (once)

In the **Replit Shell**, with the Railway Postgres **public** URL (Postgres → Connect → Public network):

```bash
RAILWAY_DATABASE_URL='postgresql://…' bash scripts/copy-from-replit.sh
```

It copies sources, emails, editions, stories and ratings, refuses to overwrite a Railway database that already has editions, and prints the row counts on both sides. Then sign in on Railway; Gmail tokens aren't copied. After that you can delete the Replit app.

## Develop locally

```bash
cp .env.example .env    # fill it in; APP_URL=http://localhost:5173 and add
                        # http://localhost:5173/api/auth/google/callback to the Google client
pnpm install
pnpm --filter @workspace/db run push          # needs DATABASE_URL in your shell
pnpm --filter @workspace/scripts run seed-demo   # optional: a sample edition
pnpm --filter @workspace/api-server run dev   # API on :8080 (reads ../../.env)
pnpm --filter @workspace/newsletter-digest run dev   # app on :5173, /api proxied to :8080
```

### Checks

- `pnpm run typecheck`: whole workspace
- `pnpm --filter @workspace/api-server run test`: unit tests. With `TEST_DATABASE_URL` set to a throwaway Postgres (schema pushed), it also tests the API flow end to end: Google sign-in (allowed, refused, forged state), token refresh, sync → generate → feedback, with Google, Gmail and Claude faked.
- `pnpm --filter @workspace/newsletter-digest run test:e2e`: Playwright on desktop and phone, including visual baselines of the v3 design (`--update-snapshots` to accept an intended change).
- `pnpm --filter @workspace/api-spec run codegen`: regenerate the API client and Zod schemas after editing `lib/api-spec/openapi.yaml`.

## How it's built

pnpm workspace, TypeScript, Node 22+.

| Path | What |
|---|---|
| `artifacts/api-server` | Express 5 API. In production it also serves the built frontend, so the app is one service. `src/daily.ts` is the morning job. |
| `artifacts/api-server/src/lib/google.ts` | Google sign-in and Gmail access (OAuth, token refresh) |
| `artifacts/api-server/src/lib/gmail.ts` | Newsletter detection and fetching |
| `artifacts/api-server/src/lib/ai-processor.ts` | The Claude call and digest building |
| `artifacts/api-server/src/lib/briefing.ts` | Sync and write-a-digest, shared by the API and the daily job |
| `artifacts/newsletter-digest` | React + Vite + Tailwind frontend (v3 "Garden" design) |
| `lib/api-spec/openapi.yaml` | The API contract; Orval generates `lib/api-client-react` and `lib/api-zod` |
| `lib/db` | Drizzle schema for Postgres |
| `scripts` | Demo seed, and the one-time copy from Replit |

Design: cream paper `#F4EFE6`, charcoal ink, garden green `#3F6B4E` for actions, pastel section tints and a night edition; Geist for the interface, Literata for long reads.

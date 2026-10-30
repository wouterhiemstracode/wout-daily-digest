# wout.daily

Your newsletters, one calm briefing. Sign in with Google, and wout.daily finds the newsletters in your Gmail, has Claude write one daily briefing from them, and lets you sort it card by card (keep / skip, swipe on a phone) into a reading list.

- **Finds newsletters by itself:** mailing-list mail (List-Unsubscribe / List-Id headers), skipping receipts, account notices, promotions and app notifications. **My sources** lists what it found, each with an on/off switch.
- **Writes the briefing** with Claude Opus 5.5: Top Stories plus sections (How I AI, Product & Design, Engineering & AI, Job Openings, …), each story with full text and a pull quote that is only kept if it's verbatim in the newsletter.
- **Runs every morning** on a schedule, or whenever you tap **New briefing**.
- **Learns your taste:** keeps and skips are counted per newsletter and section and steer the next briefing.
- **Private:** only the Google accounts in `ALLOWED_EMAILS` can sign in. Gmail access is read-only.

## Run it on Google Cloud Run

Everything runs in one Google Cloud project: **Cloud Run** for the app and **Cloud Scheduler** for the morning briefing. The database is a free **[Neon](https://neon.tech)** Postgres. You also need an [Anthropic API key](https://console.anthropic.com). Cloud Run and Scheduler stay within Google's free tier for one person (a billing card is still required); Claude costs roughly $0.30–0.80 per briefing.

### 1. Google sign-in (about 10 minutes)

1. Open [console.cloud.google.com](https://console.cloud.google.com), create a project (e.g. `wout-daily`) and **link a billing account** (Billing in the menu).
2. **APIs & Services → Library**: enable the **Gmail API**.
3. **Google Auth Platform → Get started**: app name `wout.daily`, your email for support and contact, audience **External**.
4. **Data access → Add or remove scopes**: `openid`, `.../auth/userinfo.email`, `.../auth/gmail.readonly`.
5. **Audience → Test users**: add your Gmail address.
6. **Clients → Create client**, type **Web application**. Keep the **client ID** and **client secret**. The redirect URI comes in step 3.

### 2. Database

At [neon.tech](https://neon.tech), create a free project (region near you, e.g. Frankfurt) and copy its **connection string** (`postgresql://…neon.tech/neondb?sslmode=require…`). The app creates its tables on first start.

### 3. Deploy

Open **Cloud Shell** (the `>_` button at the top of the Google Cloud console) and run:

```bash
git clone https://github.com/wouterhiemstracode/wout-daily-digest && cd wout-daily-digest
bash scripts/deploy-cloud-run.sh
```

The first run creates `.env.production`. Click **Open Editor**, fill in `DATABASE_URL` (Neon), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS` (your Gmail; comma-separate several) and `ANTHROPIC_API_KEY`, then run the script again. It:

- enables Cloud Run, Cloud Build and Cloud Scheduler
- builds the container (`Dockerfile`) and deploys it as `wout-daily` in `europe-west1`
- generates `SESSION_SECRET` and `CRON_SECRET` (kept in `.env.production`, never committed)
- schedules the morning briefing for **06:15 Europe/Amsterdam** (`SCHEDULE` and `TIME_ZONE` in `.env.production`)
- prints your app address and the three links Google needs

Paste those links into **Google Auth Platform**:
- **Clients → your client → Authorized redirect URIs:** `https://…run.app/api/auth/google/callback`
- **Branding:** home page `https://…run.app` and privacy policy `https://…run.app/privacy`

Then open the app and **Sign in with Google**. To ship new code later: `git pull && bash scripts/deploy-cloud-run.sh`.

> **Staying signed in.** While the Google app is in **Testing**, Google expires the Gmail permission after 7 days. Once Branding is filled in, **Audience → Publish app** lifts that. Google then shows "Google hasn't verified this app" once when you sign in; click **Advanced → Go to wout.daily**. Verification is only needed for apps used by other people.

### 4. Bring your data from Replit (once)

In the **Replit Shell**:

```bash
git pull
TARGET_DATABASE_URL='postgresql://…(the Neon connection string)' bash scripts/copy-from-replit.sh
```

It copies sources, emails, editions, stories and ratings, refuses to overwrite a database that already has editions, and prints the row counts on both sides. Gmail tokens aren't copied; you sign in again on the new app. Then you can delete the Replit app.

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
- `pnpm --filter @workspace/api-server run test`: unit tests. With `TEST_DATABASE_URL` set to a throwaway Postgres (the tests wipe it and apply `lib/db/migrations`), it also tests the API flow end to end: Google sign-in (allowed, refused, forged state), token refresh, sync → generate → feedback, with Google, Gmail and Claude faked.
- `pnpm --filter @workspace/newsletter-digest run test:e2e`: Playwright on desktop and phone, including visual baselines of the v3 design (`--update-snapshots` to accept an intended change).
- `pnpm --filter @workspace/api-spec run codegen`: regenerate the API client and Zod schemas after editing `lib/api-spec/openapi.yaml`.
- `pnpm --filter @workspace/db run generate`: after changing `lib/db/src/schema`, write the SQL migration that production applies on startup.

## How it's built

pnpm workspace, TypeScript, Node 22+.

| Path | What |
|---|---|
| `artifacts/api-server` | Express 5 API. In production it also serves the built frontend, so the app is one container (`Dockerfile`). `POST /api/jobs/daily` is the morning job. |
| `artifacts/api-server/src/lib/google.ts` | Google sign-in and Gmail access (OAuth, token refresh) |
| `artifacts/api-server/src/lib/gmail.ts` | Newsletter detection and fetching |
| `artifacts/api-server/src/lib/ai-processor.ts` | The Claude call and digest building |
| `artifacts/api-server/src/lib/briefing.ts` | Sync and write-a-digest, shared by the API and the daily job |
| `artifacts/newsletter-digest` | React + Vite + Tailwind frontend (v3 "Garden" design) |
| `lib/api-spec/openapi.yaml` | The API contract; Orval generates `lib/api-client-react` and `lib/api-zod` |
| `lib/db` | Drizzle schema for Postgres, and the SQL migrations in `lib/db/migrations` |
| `scripts` | Cloud Run deploy, demo seed, and the one-time copy from Replit |

Design: cream paper `#F4EFE6`, charcoal ink, garden green `#3F6B4E` for actions, pastel section tints and a night edition; Geist for the interface, Literata for long reads.

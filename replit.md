# Briefing

An AI-powered Gmail newsletter aggregator that scans your newsletters, removes noise, and generates one clean daily intelligence briefing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/newsletter-digest run dev` — run the frontend (port 22643)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; run it after pulling this branch: new columns `stories.body`, `stories.pull_quote`, `senders.auto_detected`)
- `pnpm --filter @workspace/scripts run seed-demo` — write a sample edition (no Gmail or OpenAI needed)

### Tests

- `pnpm --filter @workspace/api-server run test` — unit tests; with `TEST_DATABASE_URL` set (a throwaway Postgres with the schema pushed) also the API flow: sync → generate → feedback, with a fake inbox and model
- `pnpm --filter @workspace/newsletter-digest run test:e2e` — Playwright: behaviour on desktop and phone, plus visual baselines of the v3 Dessn frames (`--update-snapshots` to accept an intended change)

### Running locally outside Replit

Start Postgres, push the schema, seed, then run the API with `PORT=8080` and the frontend with `API_URL=http://localhost:8080 PORT=5173 BASE_PATH=/`. Gmail reports "not connected" without the Replit connector.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI via Replit AI Integrations proxy (gpt-5-mini for digest generation)
- Gmail: Replit Connectors SDK (managed OAuth, no credentials needed)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema (senders, emails, digests, sections, stories, feedback, gmail_tokens)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/gmail.ts` — Gmail connector (Replit SDK)
- `artifacts/api-server/src/lib/ai-processor.ts` — AI digest generation logic
- `artifacts/newsletter-digest/src/` — React frontend

## Architecture decisions

- Gmail access uses Replit's managed connector SDK — no OAuth credentials to configure, tokens auto-refresh
- AI uses Replit's OpenAI proxy — no API key needed, billed to Replit credits
- Each email fetch stores raw body in DB; AI processes emails into structured stories on digest generation
- Digests are structured: Digest → Sections (7 types) → Stories with relevance scores
- Feedback (thumbs up/down) updates story's `userFeedback` field for future preference learning

## Product

- **Connect Gmail and that's it**: sync scans the last 24h of the inbox, finds newsletters by their mailing-list headers (List-Unsubscribe / List-Id), skips receipts, account notices, promotions and app notifications, and adds new senders automatically
- **My sources**: the newsletters found, each with an on/off switch (off stays off); adding one by hand is a fallback
- **New briefing**: one tap checks Gmail, then the AI writes the digest. Top Stories are the 5 most relevant, and each story appears once
- **Today**: sort the edition one card at a time (keep / skip / undo; swipe on phones), reading list, who wrote in, section tiles
- **Reading view**: full story text and a pull quote (only kept if it's verbatim in the newsletter)
- **Archive**: all past digests
- **Search**: full-text search across all stories
- Each story has headline, summary, "why it matters", source link, relevance score, thumbs up/down

## User preferences

- v3 "Garden" design (from Dessn): cream paper #F4EFE6, charcoal ink, garden green #3F6B4E for actions, pastel section tints, night edition; Geist for UI, Literata for long reads
- Sections: Top Stories, How I AI, Product & Design, Engineering & AI, Job Openings, plus Funding, AI & Software, Trends, Takeaways, Watch, Links

## Gotchas

- Gmail connector requires the Replit connection to be active — manage via Replit integrations panel
- AI generation can take 10-30s for large email batches (gpt-5-mini with many newsletters)
- After any OpenAPI spec change, run codegen before editing frontend or backend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

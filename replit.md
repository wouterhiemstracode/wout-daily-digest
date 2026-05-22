# Briefing

An AI-powered Gmail newsletter aggregator that scans your newsletters, removes noise, and generates one clean daily intelligence briefing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/newsletter-digest run dev` — run the frontend (port 22643)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

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

- **Sources** page: add newsletter sender emails to track
- **Sync**: fetches last 24h emails from all tracked senders via Gmail API
- **Generate Briefing**: AI processes fetched emails → structured daily digest with 7 sections
- **Dashboard**: stats overview + latest briefing preview
- **Archive**: all past digests
- **Search**: full-text search across all stories
- Each story has headline, summary, "why it matters", source link, relevance score, thumbs up/down

## User preferences

- Dark-mode first intelligence terminal aesthetic ("Briefing")
- Dense, information-rich UI — signal over noise
- 7 digest sections: Top Stories, Funding Rounds & IPOs, AI & Software, Startup & Tech Trends, Important Takeaways, Things To Watch, Useful Links

## Gotchas

- Gmail connector requires the Replit connection to be active — manage via Replit integrations panel
- AI generation can take 10-30s for large email batches (gpt-5-mini with many newsletters)
- After any OpenAPI spec change, run codegen before editing frontend or backend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# AI Academy

An internal AI learning and intelligence platform. Built with the same stack as the existing
Sciobot NEXT project so components, Supabase patterns and tooling are reusable across
projects.

## Sections

- **Learn** — a structured AI learning map and topic detail pages.
- **Radar** — a feed of AI news, articles, papers and releases.
- **Library** — saved resources from Radar and Learn, plus personal notes.
- **Practice** — quizzes and flashcards generated from topics.
- **Build Lab** — Cursor prompts, chatbot playbooks, templates and checklists.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (design tokens mirror `sciobot-next`)
- Supabase (Postgres, Auth, Storage, Edge Functions) with `pgvector`
- Zustand for local UI state
- TanStack Query for server state

## Getting started

```bash
# 1. Install
npm install

# 2. Start Supabase locally (requires the Supabase CLI + Docker)
npm run supabase:start
npm run supabase:reset    # applies migrations + seed data

# 3. Copy env and start the dev server
cp .env.example .env
npm run dev               # http://localhost:8080
```

To work on edge functions:

```bash
npm run supabase:functions:serve
```

## Architecture

```
src/
  components/      UI primitives (button, card, input, ...) and feature components
  config/          API endpoints, navigation
  integrations/    Supabase client wrapper
  layouts/         App shell (sidebar + main)
  lib/             utilities, query client, mock data, AI enrichment service
  pages/           route components (Home, Learn, Radar, Library, Practice, BuildLab)
  router.tsx       react-router-dom routes
  services/        thin API modules (one per domain) — call Supabase directly or via edge functions
  stores/          Zustand stores for UI state
  types/           shared types (generated DB types live here too)

supabase/
  migrations/      SQL migrations: profiles, topics, resources (pgvector), saved_items,
                    notes, quizzes, rss sources/items
  functions/       Deno edge functions
    _shared/         cors + handler helpers, AI enrichment interface
    radar-ingest/    RSS ingestion (structure only — pluggable parser)
    ai-enrich/       Topic + resource AI enrichment (mock now, OpenAI-ready interface)
  seed/            mock topics, resources, quizzes, prompts
```

### Mock data first, real data later

For the MVP every domain has a `mockData` array and a service module that — by default
— resolves from those mocks. Once Supabase rows exist the same services can read from
Postgres without changing call sites. The toggle lives in `src/lib/dataMode.ts`.

### AI enrichment

`src/services/aiEnrichmentService.ts` defines the interface (`summarizeResource`,
`tagResource`, `embedText`, `generateQuiz`). The default implementation is mocked. Swap
the implementation in `supabase/functions/ai-enrich/index.ts` for a real OpenAI call
when ready — the client-side surface stays the same.

### RSS ingestion

`supabase/functions/radar-ingest/index.ts` ships the structure for fetching, parsing
and upserting items from `public.rss_sources` into `public.radar_items`. The parser
is intentionally minimal so it can be swapped for a hardened library later.

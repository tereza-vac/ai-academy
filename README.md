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
- Tailwind CSS (design tokens mirror `sciobot-next`) + `next-themes` for light / dark / system
- Supabase (Postgres, Auth, Storage, Edge Functions) with `pgvector`
- Supabase Auth with Google OAuth + email magic links
- Zustand for local UI state
- TanStack Query for server state
- Vercel AI SDK (`ai` + `@ai-sdk/openai`) inside the `ai-enrich` edge function

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

## Feature setup

### 1. Google OAuth

The client-side flow is wired up (`/login` page, `signInWithOAuth("google")`, `/auth/callback`
handler, sidebar user menu, `ProtectedRoute`). To finish the integration you only need to
provision the credentials — Supabase handles the rest of the OAuth dance.

**You have to do this once per Supabase project.**

1. **Create OAuth credentials in Google Cloud**
   1. Go to <https://console.cloud.google.com/apis/credentials> and pick (or create) a project.
   2. *OAuth consent screen* → set User Type to **Internal** (or External + add yourself as a test user), product name, support email, dev contact. Save.
   3. *Credentials* → **Create Credentials → OAuth client ID → Web application**.
   4. **Authorized JavaScript origins**:
      - `http://localhost:8080`
      - your deployed origin, e.g. `https://ai-academy.your-domain.com`
   5. **Authorized redirect URIs** (this is where Supabase finishes the handshake):
      - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   6. Copy the **Client ID** and **Client Secret**.

2. **Enable Google in Supabase**
   1. Dashboard → *Authentication → Providers → Google* → enable.
   2. Paste the Client ID and Client Secret. Save.

3. **Configure Site URL & Redirects**
   1. Dashboard → *Authentication → URL Configuration*.
   2. **Site URL**: `http://localhost:8080` for local, your deployed URL for prod.
   3. **Redirect URLs** (allow list): add both `http://localhost:8080/auth/callback`
      and `https://your-domain.com/auth/callback`.

That's it. After saving, the **Continue with Google** button on `/login` will work.
The email magic-link option works automatically with Supabase's built-in email auth —
no extra setup needed.

> Mock mode (`VITE_DATA_MODE=mock`) bypasses auth entirely so you can run the app
> without configuring any provider.

### 2. Dark mode / light mode / system mode

Wired through `next-themes`. The toggle lives in the sidebar (full segmented control when
expanded, single cycling button when collapsed). All Tailwind design tokens already expose
both palettes via CSS variables in `src/index.css` — no per-component dark styling is needed.

- Default: `system`
- Storage key: `ai-academy-theme` (per origin)
- Switches the `.dark` class on `<html>` (`darkMode: ["class"]` in `tailwind.config.ts`)

### 3. Real LLM integration

The `ai-enrich` edge function calls OpenAI through the Vercel AI SDK, with structured
output via `zod` schemas (mirrors the `sciobot-next/supabase/functions/_shared/ai.ts`
pattern):

- `summarizeResource` — `generateObject` with a `{summary, tags, topicHints}` schema.
- `embedText` — `embed` against `text-embedding-3-small` (1536-d, matches the
  `pgvector` columns in our migrations).
- `generateQuiz` — `generateObject` returning typed MCQ + flashcard questions.

If `OPENAI_API_KEY` is unset the function transparently falls back to the deterministic
mock implementation, so the UI never breaks during development.

**To enable real generation:**

```bash
# Local dev (reads from .env in supabase/.env or your shell)
echo 'OPENAI_API_KEY=sk-...' >> .env
npm run supabase:functions:serve

# Deployed Supabase project
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_CHAT_MODEL=gpt-4o-mini          # optional override
supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # optional
supabase functions deploy ai-enrich
```

You can try it on any topic page — the **Practice with AI** card has a "Generate"
button that calls `defaultEnrichment.generateQuiz`, which routes to the edge function
in Supabase mode.

> Want multi-provider routing like sciobot-next? Swap `createOpenAI(...)` in
> `supabase/functions/_shared/ai.ts` for `gateway(...)` from `npm:ai@6` and set
> `AI_GATEWAY_API_KEY`. The `AIEnrichmentService` surface stays identical.

## Architecture

```
src/
  components/      UI primitives, theme provider, auth-aware shell components
  config/          API endpoints, navigation
  hooks/           useAuth (Supabase Auth wrapper)
  integrations/    Supabase client wrapper
  layouts/         App shell (sidebar + main)
  lib/             utilities, query client, mock data, data-mode switch
  pages/           Home, Learn, Radar, Library, Practice, BuildLab, Login, AuthCallback
  router.tsx       react-router-dom routes (protected behind ProtectedRoute)
  services/        thin API modules (one per domain) + authApi + aiEnrichmentService
  stores/          Zustand stores (uiStore, authStore, quizRunnerStore)
  types/           shared types

supabase/
  migrations/      SQL migrations: profiles, topics, resources (pgvector), saved_items,
                    notes, quizzes, rss sources/items
  functions/       Deno edge functions
    _shared/         cors + handler + ai helpers (Vercel AI SDK)
    radar-ingest/    RSS ingestion
    ai-enrich/       summarize / embed / generateQuiz (OpenAI when configured)
  seed/            mock topics, resources, quizzes, prompts
```

### Mock data first, real data later

Every domain has a `mockData` array and a service module that — by default — resolves
from those mocks when `VITE_DATA_MODE=mock`. With Supabase configured the same services
read from Postgres and call edge functions, with no call-site changes. The toggle lives
in `src/lib/dataMode.ts`.

### AI enrichment

`src/services/aiEnrichmentService.ts` defines the interface (`summarizeResource`,
`embedText`, `generateQuiz`) and exports `defaultEnrichment`, which picks `remoteEnrichment`
(the `ai-enrich` edge function) when Supabase is configured and `mockEnrichment` otherwise.

### RSS ingestion

`supabase/functions/radar-ingest/index.ts` fetches, parses and upserts items from
`public.rss_sources` into `public.radar_items`. The parser is intentionally minimal so it
can be swapped for a hardened library later.

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

## i18n & localization

i18n uses [`typesafe-i18n`](https://github.com/ivanhofer/typesafe-i18n), mirroring
the `sciobot-next` setup. Translations are split into per-namespace folders, and
typed accessor functions are auto-generated from the base locale.

```
src/i18n/
  cs/             base locale (Čeština) — full set of keys, typed `BaseTranslation`
    common/index.ts, nav/index.ts, userMenu/index.ts, auth/index.ts,
    home/index.ts, learn/index.ts, radar/index.ts, library/index.ts,
    practice/index.ts, buildLab/index.ts, content/index.ts
  en/             English — typed `NamespaceXxxTranslation` (forces full coverage)
  sk/             Slovenčina
  pl/             Polski
  formatters.ts   number formatter, BCP-47 aware
  i18n-*.ts       auto-generated by `typesafe-i18n`
  i18n-react.tsx  auto-generated React provider + `useI18nContext` hook
```

Usage in components:

```tsx
import { useI18nContext } from "@/i18n/i18n-react";

function MyComponent() {
  const { LL } = useI18nContext();
  return <h1>{LL.home.title()}</h1>;
}
```

When you add or rename a key:

```bash
npm run i18n        # watch mode — regenerates types as you edit
npm run i18n:build  # one-off generation (used by CI / pre-commit)
```

The active locale is owned by `src/stores/localeStore.ts` (Zustand, persisted to
`localStorage` under `ai-academy-locale`). Users switch it from the
**Language** submenu in the sidebar user menu. `src/providers/I18nBootProvider.tsx`
loads the current locale's namespaces on boot and renders a loading screen until
they're ready.

Available locales: `cs` (base), `en`, `sk`, `pl`. To add another locale, mirror
an existing folder (e.g. copy `en/` to `de/`), translate the values, then run
`npm run i18n:build`. The store automatically picks up `locales` from
`i18n-util.ts`, so the new option appears in the language picker without code
changes.

### Localized content data

Learning/content data follows the same translation-key idea used in Priprava's
`Reo` localizer:

- curated database rows store stable keys such as
  `content.topics.howLlmsWork.title`
- localized strings live in `src/i18n/*/content/index.ts`
- `src/lib/contentLocalization.ts` resolves each key for the active locale and
  falls back to Czech/base text when a key is missing

The migration `20260101000009_content_translations.sql` adds key columns like
`title_key`, `summary_key`, `body_key` and `description_key` to the content
tables. It intentionally does **not** use JSONB translation blobs or
per-entity translation tables.

Question-level quiz content keeps the existing `questions` jsonb payload but
uses deterministic keys derived from the quiz slug and question id, e.g.
`content.quizzes.howLlmsWorkMcq.q1.prompt` and
`content.quizzes.howLlmsWorkMcq.q1.o2`.

### 1dx dev monitor

This repo includes a root `1dx.json`, adapted from `sciobot-next`. It runs the
same development services from one TUI: Docker/Supabase, Vite frontend and the
`typesafe-i18n` watcher. The project remains npm-based; the monitor is launched
with Bun's `bunx`.

```bash
npm run dx:start
```

Useful shortcuts inside the monitor:

- `1` run Supabase migrations and regenerate DB types
- `2` reset the local DB
- `3` start dead services
- `5` open Supabase Studio
- `8` regenerate i18n types
- `b` run build
- `l` run lint
- `f` open frontend

## Architecture

```
src/
  components/      UI primitives, theme provider, auth-aware shell components
  config/          API endpoints, navigation
  hooks/           useAuth (Supabase Auth wrapper)
  i18n/            typesafe-i18n dictionaries (cs base + en/sk/pl) and generated types
  integrations/    Supabase client wrapper
  layouts/         App shell (sidebar + main)
  lib/             utilities, query client, mock data, data-mode switch
  pages/           Home, Learn, Radar, Library, Practice, BuildLab, Login, AuthCallback
  providers/       cross-cutting providers (i18n boot)
  router.tsx       react-router-dom routes (protected behind ProtectedRoute)
  services/        thin API modules (one per domain) + authApi + aiEnrichmentService
  stores/          Zustand stores (uiStore, authStore, localeStore, quizRunnerStore)
  types/           shared types

supabase/
  migrations/      SQL migrations: profiles, topics, resources (pgvector), saved_items,
                    notes, quizzes, rss sources/items, content translation keys,
                    canon / radar score columns
  functions/       Deno edge functions
    _shared/         cors + handler + rss parser + ai helpers (Vercel AI SDK)
    radar-ingest/    RSS / arXiv / HF Daily Papers ingestion + ranking
    papers-search/   Scholar-like fan-out (Semantic Scholar + OpenAlex + arXiv)
    ai-enrich/       summarize / embed / generateQuiz (OpenAI when configured)
  seed/            tracks, topics, resources, quizzes, build-lab,
                    rss_sources (weighted), canonical papers
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

### RSS / arXiv / HF Daily Papers ingestion

`supabase/functions/radar-ingest/index.ts` polls every active `public.rss_sources` row
and dispatches based on `source_type`:

- `rss` — generic RSS/Atom via the shared XML parser
- `arxiv` — arXiv API (Atom + extra metadata: arXiv id, category tags)
- `hf_daily_papers` — Hugging Face Daily Papers JSON (includes upvote counts)

Every upsert recomputes a deterministic global ranking score on the row:

```
score = source.weight * (recency_decay + 0.3 * log10(1 + hf_upvotes))
recency_decay = exp(-age_ms / half_life), half_life = 7 days
```

The Radar page sorts by this score for the "Recommended" tab and falls back to
`published_at` for "Recent". Per-user pgvector ranking is a deferred Phase E
(an `embedding vector(1536)` column is already reserved on `radar_items`).

Trigger the function manually with:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/radar-ingest"
```

Configure a Supabase scheduled function (or `pg_cron`) to run it on a cadence
once you're past MVP.

### Canon (foundational papers)

`supabase/seed/06_canonical_papers.sql` seeds ~14 foundational AI papers as
regular `public.resources` rows tagged with `is_canonical = true` and a
`canonical_category` (foundations, models, alignment, prompting, agents, rag).
They surface on the Library page under the **Canon** tab and reuse the same
save flow as any other resource.

### Scholar-like search

`supabase/functions/papers-search/index.ts` fans out to Semantic Scholar and
OpenAlex (with arXiv as a last-resort fallback), normalizes hits into a single
`PaperHit` shape and dedupes by DOI → arXiv id → normalized title. No upstream
API keys are required.

The client side at `src/pages/PaperSearchPage.tsx` (route `/library/search`)
exposes a search box with year / min-citations / sort filters; clicking
**Save** upserts the hit into `public.resources` and saves it to the user's
library via the existing `saved_items` flow.

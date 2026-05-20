/**
 * AI enrichment service — the **single** seam between the rest of the app and
 * any LLM provider.
 *
 * For the MVP this returns deterministic mock data. When you wire OpenAI:
 *
 *   1. Implement the same `AIEnrichmentService` interface in
 *      `supabase/functions/ai-enrich/index.ts` (server-side, key-protected).
 *   2. Swap `defaultEnrichment` for `remoteEnrichment` below.
 *   3. Callers (`services/resourcesApi`, etc.) stay untouched.
 *
 * Keep the surface narrow — it should always be obvious which calls cost money.
 */

import { API_CONFIG } from "@/config/api";
import { dataMode } from "@/lib/dataMode";
import { supabase } from "@/integrations/supabase/client";

export interface SummarizeInput {
  url: string;
  title: string;
  rawText?: string;
}

export interface SummarizeOutput {
  summary: string;
  tags: string[];
  topicHints: string[];
}

export interface EmbedInput {
  text: string;
}

export interface EmbedOutput {
  embedding: number[];
  model: string;
}

export interface GenerateQuizInput {
  topicTitle: string;
  topicBody: string;
  count?: number;
}

export interface GenerateQuizOutput {
  questions: Array<{
    id: string;
    kind: "mcq" | "flashcard";
    prompt: string;
    options?: string[];
    answerIndex?: number;
    answer?: string;
    explanation?: string;
  }>;
}

export interface AIEnrichmentService {
  summarizeResource(input: SummarizeInput): Promise<SummarizeOutput>;
  embedText(input: EmbedInput): Promise<EmbedOutput>;
  generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput>;
}

/* ---------- Mock implementation ---------- */

function deterministicTags(text: string): string[] {
  const lower = text.toLowerCase();
  const candidates: Array<[string, string]> = [
    ["llm", "llm"], ["embedding", "embeddings"], ["rag", "rag"],
    ["cursor", "cursor"], ["agent", "agents"], ["eval", "evals"],
    ["pgvector", "pgvector"], ["supabase", "supabase"],
    ["prompt", "prompting"], ["claude", "claude"], ["openai", "openai"],
  ];
  return Array.from(new Set(candidates.filter(([needle]) => lower.includes(needle)).map(([, tag]) => tag)));
}

function deterministicEmbedding(seed: string, dimensions = 1536): number[] {
  // Tiny mulberry32 seeded by the string — enough to give us stable, comparable
  // vectors so similarity ordering in mock mode is meaningful.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  let state = h >>> 0;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) arr[i] = next() * 2 - 1;
  return arr;
}

export const mockEnrichment: AIEnrichmentService = {
  async summarizeResource({ title, rawText }) {
    const source = rawText ?? title;
    const summary =
      source.length > 240
        ? `${source.slice(0, 220).trim()}…`
        : `Summary placeholder for "${title}". Hook up OpenAI for the real thing.`;
    return {
      summary,
      tags: deterministicTags(`${title} ${rawText ?? ""}`),
      topicHints: [],
    };
  },
  async embedText({ text }) {
    return { embedding: deterministicEmbedding(text), model: "mock-embedding-1536" };
  },
  async generateQuiz({ topicTitle, count = 3 }) {
    return {
      questions: Array.from({ length: count }, (_, i) => ({
        id: `mock-${i}`,
        kind: "mcq",
        prompt: `(${topicTitle}) Sample question #${i + 1}?`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        answerIndex: 0,
        explanation: "Replace with real generated content once OpenAI is wired in.",
      })),
    };
  },
};

/* ---------- Remote implementation (calls the `ai-enrich` edge function) ---------- */

type Action = "summarize" | "embed" | "generateQuiz";

async function callEdge<T>(action: Action, payload: unknown): Promise<T> {
  // Prefer the user's access token (lets the edge function attribute usage)
  // and fall back to the publishable key for unauthenticated calls.
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? API_CONFIG.SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(API_CONFIG.AI_ENRICH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ai-enrich ${action} failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data: T; error: string | null };
  if (json.error) throw new Error(json.error);
  return json.data;
}

export const remoteEnrichment: AIEnrichmentService = {
  summarizeResource: (input) => callEdge<SummarizeOutput>("summarize", input),
  embedText: (input) => callEdge<EmbedOutput>("embed", input),
  generateQuiz: (input) => callEdge<GenerateQuizOutput>("generateQuiz", input),
};

/**
 * Default implementation the rest of the app should import.
 *
 * - In `mock` mode (no Supabase URL) we use bundled `mockEnrichment` so the
 *   app boots without any backend.
 * - In `supabase` mode we go through the `ai-enrich` edge function, which
 *   in turn calls OpenAI (or its mock fallback) — see
 *   `supabase/functions/_shared/ai.ts`.
 */
export const defaultEnrichment: AIEnrichmentService =
  dataMode === "supabase" ? remoteEnrichment : mockEnrichment;

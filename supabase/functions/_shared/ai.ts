/**
 * Edge-side AI enrichment.
 *
 * Mirrors the client-side `AIEnrichmentService` interface from
 * `src/services/aiEnrichmentService.ts`. Two implementations:
 *
 *   - `mockEnrichment`  — deterministic placeholder, lets the rest of the
 *                          pipeline work without an OpenAI key.
 *   - `openAIEnrichment` — stubbed; flip to a real `fetch` call to
 *                          `https://api.openai.com/v1/...` when ready. The
 *                          types are designed to mirror OpenAI's API so wiring
 *                          stays mechanical.
 *
 * Picks an implementation based on whether `OPENAI_API_KEY` is set.
 */

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

function deterministicTags(text: string): string[] {
  const lower = text.toLowerCase();
  const candidates: Array<[string, string]> = [
    ["llm", "llm"], ["embedding", "embeddings"], ["rag", "rag"],
    ["cursor", "cursor"], ["agent", "agents"], ["eval", "evals"],
    ["pgvector", "pgvector"], ["supabase", "supabase"],
    ["prompt", "prompting"], ["claude", "claude"], ["openai", "openai"],
  ];
  return Array.from(new Set(candidates.filter(([n]) => lower.includes(n)).map(([, t]) => t)));
}

function deterministicEmbedding(seed: string, dim = 1536): number[] {
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
  const arr = new Array(dim);
  for (let i = 0; i < dim; i++) arr[i] = next() * 2 - 1;
  return arr;
}

export const mockEnrichment: AIEnrichmentService = {
  async summarizeResource({ title, rawText }) {
    const source = rawText ?? title;
    const summary =
      source.length > 240
        ? `${source.slice(0, 220).trim()}…`
        : `Summary placeholder for "${title}". Wire OPENAI_API_KEY for the real thing.`;
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

/**
 * Stubbed OpenAI implementation. The endpoints and request shapes are
 * what you'd actually call — uncomment the `fetch` blocks and remove the
 * `throw` to enable.
 */
export const openAIEnrichment: AIEnrichmentService = {
  async summarizeResource(_input) {
    throw new Error(
      "openAIEnrichment.summarizeResource is not wired yet. " +
      "Replace the body with a call to https://api.openai.com/v1/chat/completions.",
    );
  },
  async embedText(_input) {
    throw new Error(
      "openAIEnrichment.embedText is not wired yet. " +
      "Replace the body with a call to https://api.openai.com/v1/embeddings " +
      "(model: text-embedding-3-small).",
    );
  },
  async generateQuiz(_input) {
    throw new Error(
      "openAIEnrichment.generateQuiz is not wired yet. " +
      "Replace the body with a structured-output call (response_format: json_schema).",
    );
  },
};

export function pickEnrichment(): AIEnrichmentService {
  // Today: always mock. Once `openAIEnrichment` is implemented, uncomment.
  // const hasKey = Boolean(Deno.env.get("OPENAI_API_KEY"));
  // return hasKey ? openAIEnrichment : mockEnrichment;
  return mockEnrichment;
}

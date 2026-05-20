/**
 * Edge-side AI enrichment.
 *
 * Mirrors the client-side `AIEnrichmentService` from
 * `src/services/aiEnrichmentService.ts`. Two real implementations are wired
 * here:
 *
 *   - `mockEnrichment`    deterministic placeholders. Always available, no
 *                         secrets required.
 *   - `openAIEnrichment`  real OpenAI calls via the Vercel AI SDK
 *                         (`generateText`, `generateObject`, `embed`) — the
 *                         same pattern sciobot-next uses, scaled down to the
 *                         one provider we need today.
 *
 * `pickEnrichment()` chooses based on `OPENAI_API_KEY`. If you'd rather route
 * through the Vercel AI Gateway (multi-provider with one key, sciobot's
 * approach), set `AI_GATEWAY_API_KEY` and swap the `createOpenAI` factory for
 * `gateway` from `npm:ai` — the surface stays identical.
 */
import { embed, generateObject } from "npm:ai@6";
import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { z } from "npm:zod@4";

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

/* ---------- Mock implementation (deterministic, no secrets) ---------- */

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

/* ---------- OpenAI implementation (Vercel AI SDK) ---------- */

const CHAT_MODEL = Deno.env.get("OPENAI_CHAT_MODEL") ?? "gpt-4o-mini";
const EMBEDDING_MODEL = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";

function makeOpenAI() {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return createOpenAI({ apiKey });
}

// OpenAI structured-output strict mode requires every property to appear in
// `required`. Use `.nullable()` instead of `.optional()` so the field is always
// present (with a value or `null`) and the schema validates as strict.
const QuizQuestionSchema = z.object({
  id: z.string(),
  kind: z.enum(["mcq", "flashcard"]),
  prompt: z.string(),
  options: z.array(z.string()).nullable()
    .describe("4 options for MCQ questions; null for flashcards."),
  answerIndex: z.number().int().min(0).nullable()
    .describe("0-based index of the correct option for MCQ; null for flashcards."),
  answer: z.string().nullable()
    .describe("The answer text for flashcards; null for MCQ."),
  explanation: z.string().nullable()
    .describe("Brief explanation of the answer."),
});

const SummarySchema = z.object({
  summary: z.string().describe("2–4 sentence summary suitable for an AI learning library."),
  tags: z.array(z.string()).describe("Up to 8 short, lowercase tags. No leading #."),
  topicHints: z
    .array(z.string())
    .describe("Up to 5 topic slugs this resource probably relates to (empty array if none)."),
});

export const openAIEnrichment: AIEnrichmentService = {
  async summarizeResource({ url, title, rawText }) {
    const openai = makeOpenAI();
    const { object } = await generateObject({
      model: openai(CHAT_MODEL),
      schema: SummarySchema,
      system:
        "You produce concise, factual summaries for an internal AI learning platform. " +
        "Prefer specific terminology over marketing language. If you don't have enough context, say so.",
      prompt: [
        `URL: ${url}`,
        `Title: ${title}`,
        rawText ? `Content:\n${rawText.slice(0, 6000)}` : null,
      ].filter(Boolean).join("\n\n"),
    });
    return object;
  },

  async embedText({ text }) {
    const openai = makeOpenAI();
    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: text,
    });
    return { embedding, model: EMBEDDING_MODEL };
  },

  async generateQuiz({ topicTitle, topicBody, count = 4 }) {
    const openai = makeOpenAI();
    const { object } = await generateObject({
      model: openai(CHAT_MODEL),
      schema: z.object({
        questions: z.array(QuizQuestionSchema).min(1).max(10),
      }),
      system:
        "You write short quizzes for an internal AI learning platform. Mix multiple-choice " +
        "and flashcards. For MCQ: 4 options, exactly one correct, `answerIndex` is 0-based, " +
        "include a brief `explanation`. For flashcards: a `prompt` (question) and `answer`. " +
        "Use stable string ids like 'q1', 'q2', ….",
      prompt: [
        `Generate ${count} questions for the topic "${topicTitle}".`,
        `Topic body:\n${topicBody.slice(0, 4000)}`,
      ].join("\n\n"),
    });
    // Strip the `null` placeholders the model has to emit under strict mode so
    // the client sees the original `field?: T` shape.
    return {
      questions: object.questions.map((q, i) => ({
        id: q.id || `q${i + 1}`,
        kind: q.kind,
        prompt: q.prompt,
        ...(q.options !== null ? { options: q.options } : {}),
        ...(q.answerIndex !== null ? { answerIndex: q.answerIndex } : {}),
        ...(q.answer !== null ? { answer: q.answer } : {}),
        ...(q.explanation !== null ? { explanation: q.explanation } : {}),
      })),
    };
  },
};

/**
 * Pick an implementation based on env. Today: real OpenAI when the key is set,
 * mock otherwise. Add more branches here (gateway, Anthropic, …) as needed.
 */
export function pickEnrichment(): AIEnrichmentService {
  const hasOpenAIKey = Boolean(Deno.env.get("OPENAI_API_KEY"));
  return hasOpenAIKey ? openAIEnrichment : mockEnrichment;
}

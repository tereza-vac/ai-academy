/**
 * Mock data for the MVP. Mirrors the Supabase seed in `supabase/seed/*.sql`
 * so the app works identically whether running on Supabase or in mock mode.
 *
 * IDs are stable strings (not UUIDs) so they're easy to read in URLs.
 */
import type {
  BuildLabItem,
  Note,
  PaperHit,
  Quiz,
  RadarItem,
  Resource,
  SavedItem,
  Topic,
  Track,
} from "@/types/domain";

const id = (slug: string) => slug;

export const mockTracks: Track[] = [
  { id: id("track-foundations"), slug: "foundations", title: "Foundations",
    description: "Core ideas: tokens, embeddings, transformers and what an LLM actually does.",
    color: "brand", position: 1 },
  { id: id("track-prompting"), slug: "prompting", title: "Prompting",
    description: "Practical prompting patterns, system prompts and structured output.",
    color: "premium", position: 2 },
  { id: id("track-building"), slug: "building", title: "Building with AI",
    description: "Cursor, RAG, evals and shipping AI features.",
    color: "success", position: 3 },
  { id: id("track-agents"), slug: "agents", title: "Agents & Workflows",
    description: "Tools, multi-step reasoning and orchestration patterns.",
    color: "coral", position: 4 },
];

export const mockTopics: Topic[] = [
  {
    id: id("how-llms-work"), trackId: id("track-foundations"),
    slug: "how-llms-work", title: "How LLMs actually work",
    summary: "A short tour from tokens to next-token prediction.",
    bodyMd:
`## What is a token?

LLMs see text as **tokens**, not characters. A token is roughly 4 characters of English.

## Next-token prediction

Given a sequence of tokens, the model predicts the most likely next token. That single mechanic — repeated — produces everything you see in chat output.

## Why this matters

Understanding this explains:

- why tokens (and tokenization) drive cost and latency,
- why prompts and context windows have limits,
- why temperature changes output diversity.`,
    difficulty: "beginner", estimatedMinutes: 12,
    prerequisites: [], tags: ["basics", "tokens", "llm"], position: 1,
  },
  {
    id: id("embeddings-101"), trackId: id("track-foundations"),
    slug: "embeddings-101", title: "Embeddings 101",
    summary: "Vectors that capture meaning. The basis of search and RAG.",
    bodyMd:
`Embeddings turn text into a vector of floats. Similar meaning → close in vector space.

## When to use them

- Semantic search
- Clustering
- Recommendations
- Retrieval-Augmented Generation (RAG)`,
    difficulty: "beginner", estimatedMinutes: 10,
    prerequisites: ["how-llms-work"], tags: ["embeddings", "rag", "vectors"], position: 2,
  },
  {
    id: id("system-prompts"), trackId: id("track-prompting"),
    slug: "system-prompts", title: "System prompts that hold up",
    summary: "Structure, role, constraints, examples and refusals.",
    bodyMd:
`A system prompt sets durable behaviour. Treat it like product copy: precise, testable, and small enough to fit in your head.

## Skeleton

\`\`\`
Role
Context
Task
Constraints
Output format
\`\`\``,
    difficulty: "beginner", estimatedMinutes: 15,
    prerequisites: [], tags: ["prompting", "system-prompt"], position: 1,
  },
  {
    id: id("structured-output"), trackId: id("track-prompting"),
    slug: "structured-output", title: "Structured output (JSON, tools, schemas)",
    summary: "When you want machines to consume model output.",
    bodyMd:
`When the consumer is another program, prefer structured output:

- JSON mode
- Tool / function calling
- Strict schemas (Zod, JSON Schema)`,
    difficulty: "intermediate", estimatedMinutes: 18,
    prerequisites: ["system-prompts"], tags: ["json", "tools", "schemas"], position: 2,
  },
  {
    id: id("cursor-day-one"), trackId: id("track-building"),
    slug: "cursor-day-one", title: "Cursor on day one",
    summary: "Setup, .cursor/rules, models and the agent loop.",
    bodyMd:
`## Install

Download Cursor and sign in. Set your default model.

## Project rules

Create \`.cursor/rules/your-rule.md\` to give the agent persistent guidance for this repo.`,
    difficulty: "beginner", estimatedMinutes: 12,
    prerequisites: [], tags: ["cursor", "ide", "setup"], position: 1,
  },
  {
    id: id("rag-in-an-hour"), trackId: id("track-building"),
    slug: "rag-in-an-hour", title: "RAG in an hour",
    summary: "Chunking, embeddings, similarity search, re-ranking, prompting.",
    bodyMd:
`## The pipeline

1. Chunk
2. Embed
3. Store
4. Retrieve
5. (Re-rank)
6. Prompt with context`,
    difficulty: "intermediate", estimatedMinutes: 35,
    prerequisites: ["embeddings-101", "system-prompts"],
    tags: ["rag", "pgvector", "supabase"], position: 2,
  },
  {
    id: id("evals-that-matter"), trackId: id("track-building"),
    slug: "evals-that-matter", title: "Evals that matter",
    summary: "From spreadsheet-graded prompts to automated scoring.",
    bodyMd:
`Three kinds of evals you actually need:

- **Reference-based** — gold answer comparison.
- **Rubric-based** — a small LLM judge with a rubric.
- **A/B in production** — measure user behaviour.`,
    difficulty: "intermediate", estimatedMinutes: 25,
    prerequisites: ["system-prompts"], tags: ["evals", "quality"], position: 3,
  },
  {
    id: id("tools-and-function-calling"), trackId: id("track-agents"),
    slug: "tools-and-function-calling", title: "Tools & function calling",
    summary: "Give a model verbs. Then bound what it can do.",
    bodyMd: "Tools turn an LLM into something that can act. Define a JSON schema, the model fills it in, your code runs it.",
    difficulty: "intermediate", estimatedMinutes: 20,
    prerequisites: ["structured-output"], tags: ["agents", "tools"], position: 1,
  },
  {
    id: id("multi-step-agents"), trackId: id("track-agents"),
    slug: "multi-step-agents", title: "Multi-step agents",
    summary: "Planning, memory, retries and when to give up.",
    bodyMd:
`A short overview of:

- ReAct
- Plan-and-execute
- Reflection
- Hand-offs`,
    difficulty: "advanced", estimatedMinutes: 30,
    prerequisites: ["tools-and-function-calling"], tags: ["agents", "planning"], position: 2,
  },
  {
    id: id("agent-evals"), trackId: id("track-agents"),
    slug: "agent-evals", title: "Evaluating agents",
    summary: "Trace, score, and improve multi-step systems.",
    bodyMd: "Single-shot prompt evals don't cover agents. You need trajectory evals.",
    difficulty: "advanced", estimatedMinutes: 25,
    prerequisites: ["evals-that-matter", "multi-step-agents"],
    tags: ["agents", "evals"], position: 3,
  },
];

export const mockResources: Resource[] = [
  {
    id: id("res-gpt-4"), url: "https://openai.com/research/gpt-4",
    title: "GPT-4 technical report", sourceName: "OpenAI", kind: "paper",
    summary: "Technical report describing GPT-4's capabilities and limitations.",
    author: "OpenAI", publishedAt: "2023-03-14T00:00:00Z", imageUrl: null,
    tags: ["llm", "gpt-4", "foundations"], topicIds: [id("how-llms-work")],
    enrichmentStatus: "manual",
  },
  {
    id: id("res-claude-3"), url: "https://www.anthropic.com/news/claude-3-family",
    title: "Introducing the Claude 3 model family", sourceName: "Anthropic", kind: "release",
    summary: "Announcement of Claude 3 Haiku, Sonnet and Opus, with benchmarks and use-cases.",
    author: "Anthropic", publishedAt: "2024-03-04T00:00:00Z", imageUrl: null,
    tags: ["claude", "anthropic", "models"], topicIds: [],
    enrichmentStatus: "manual",
  },
  {
    id: id("res-react"), url: "https://arxiv.org/abs/2210.03629",
    title: "ReAct: Synergizing Reasoning and Acting in Language Models",
    sourceName: "arXiv", kind: "paper",
    summary: "The original ReAct paper. Combines chain-of-thought reasoning with tool use.",
    author: "Yao et al.", publishedAt: "2022-10-06T00:00:00Z", imageUrl: null,
    tags: ["agents", "react", "tools"],
    topicIds: [id("tools-and-function-calling"), id("multi-step-agents")],
    enrichmentStatus: "manual",
  },
  {
    id: id("res-cursor-agent"), url: "https://docs.cursor.com/agent",
    title: "Cursor Agent documentation", sourceName: "Cursor", kind: "article",
    summary: "How the Cursor agent works: tools, rules, modes and best practices.",
    author: "Cursor", publishedAt: "2025-01-15T00:00:00Z", imageUrl: null,
    tags: ["cursor", "agents", "docs"], topicIds: [id("cursor-day-one")],
    enrichmentStatus: "manual",
  },
  {
    id: id("res-supabase-ai"), url: "https://supabase.com/docs/guides/ai",
    title: "Supabase AI & Vectors", sourceName: "Supabase", kind: "article",
    summary: "Using pgvector with Supabase: storage, indexing and similarity search.",
    author: "Supabase", publishedAt: "2024-08-01T00:00:00Z", imageUrl: null,
    tags: ["pgvector", "supabase", "rag"],
    topicIds: [id("rag-in-an-hour"), id("embeddings-101")],
    enrichmentStatus: "manual",
  },
  {
    id: id("res-evals"), url: "https://hamel.dev/blog/posts/evals/",
    title: "Your AI product needs evals", sourceName: "hamel.dev", kind: "article",
    summary: "A pragmatic case for building evals before optimising prompts.",
    author: "Hamel Husain", publishedAt: "2024-03-21T00:00:00Z", imageUrl: null,
    tags: ["evals", "quality", "blog"], topicIds: [id("evals-that-matter")],
    enrichmentStatus: "manual",
  },
];

// A small set of canonical / foundational papers, exposed via /library/canon
// in mock mode. The Supabase seed in `06_canonical_papers.sql` mirrors these.
const mockCanonicalResources: Resource[] = [
  {
    id: id("res-attention-is-all-you-need"),
    url: "https://arxiv.org/abs/1706.03762",
    title: "Attention Is All You Need", sourceName: "arXiv", kind: "paper",
    summary: "Original Transformer paper. The foundation of modern LLMs.",
    author: "Vaswani et al.", publishedAt: "2017-06-12T00:00:00Z", imageUrl: null,
    tags: ["transformer", "foundations", "attention"], topicIds: [],
    enrichmentStatus: "manual",
    externalId: "arXiv:1706.03762",
    isCanonical: true, canonicalCategory: "foundations", canonicalPosition: 1,
  },
  {
    id: id("res-scaling-laws"),
    url: "https://arxiv.org/abs/2001.08361",
    title: "Scaling Laws for Neural Language Models", sourceName: "arXiv", kind: "paper",
    summary: "OpenAI scaling laws: how model performance scales with data, params and compute.",
    author: "Kaplan et al.", publishedAt: "2020-01-23T00:00:00Z", imageUrl: null,
    tags: ["scaling", "openai", "foundations"], topicIds: [],
    enrichmentStatus: "manual",
    externalId: "arXiv:2001.08361",
    isCanonical: true, canonicalCategory: "foundations", canonicalPosition: 2,
  },
  {
    id: id("res-chinchilla"),
    url: "https://arxiv.org/abs/2203.15556",
    title: "Chinchilla: Training Compute-Optimal LLMs", sourceName: "arXiv", kind: "paper",
    summary: "DeepMind shows most LLMs were data-undertrained for their compute budget.",
    author: "Hoffmann et al.", publishedAt: "2022-03-29T00:00:00Z", imageUrl: null,
    tags: ["scaling", "deepmind", "training"], topicIds: [],
    enrichmentStatus: "manual",
    externalId: "arXiv:2203.15556",
    isCanonical: true, canonicalCategory: "foundations", canonicalPosition: 3,
  },
  {
    id: id("res-instructgpt"),
    url: "https://arxiv.org/abs/2203.02155",
    title: "InstructGPT: Training LLMs to Follow Instructions",
    sourceName: "arXiv", kind: "paper",
    summary: "The paper behind ChatGPT: RLHF that taught GPT-3 to follow instructions.",
    author: "Ouyang et al.", publishedAt: "2022-03-04T00:00:00Z", imageUrl: null,
    tags: ["rlhf", "alignment", "openai"], topicIds: [],
    enrichmentStatus: "manual",
    externalId: "arXiv:2203.02155",
    isCanonical: true, canonicalCategory: "alignment", canonicalPosition: 1,
  },
  {
    id: id("res-cot"),
    url: "https://arxiv.org/abs/2201.11903",
    title: "Chain-of-Thought Prompting", sourceName: "arXiv", kind: "paper",
    summary: "Prompts with intermediate reasoning steps improve multi-step reasoning in LLMs.",
    author: "Wei et al.", publishedAt: "2022-01-28T00:00:00Z", imageUrl: null,
    tags: ["prompting", "reasoning", "cot"], topicIds: [],
    enrichmentStatus: "manual",
    externalId: "arXiv:2201.11903",
    isCanonical: true, canonicalCategory: "prompting", canonicalPosition: 1,
  },
  {
    id: id("res-rag-original"),
    url: "https://arxiv.org/abs/2005.11401",
    title: "Retrieval-Augmented Generation for NLP", sourceName: "arXiv", kind: "paper",
    summary: "The original RAG paper: combine retrieve + generate for knowledge-intensive tasks.",
    author: "Lewis et al.", publishedAt: "2020-05-22T00:00:00Z", imageUrl: null,
    tags: ["rag", "retrieval", "nlp"], topicIds: [],
    enrichmentStatus: "manual",
    externalId: "arXiv:2005.11401",
    isCanonical: true, canonicalCategory: "rag", canonicalPosition: 1,
  },
];

// Merge canonical papers into the main mock list so save/lookup works.
mockResources.push(...mockCanonicalResources);

const radarCategories = ["product", "research", "community", "news"] as const;
const radarKinds: RadarItem["kind"][] = [
  "release", "paper", "community", "article", "release", "paper",
];

export const mockRadar: RadarItem[] = mockResources.slice(0, 12).map((r, idx) => ({
  id: `radar-${r.id}`,
  link: r.url,
  title: r.title,
  summary: r.summary,
  author: r.author,
  publishedAt: r.publishedAt,
  sourceName: r.sourceName,
  sourceCategory: radarCategories[idx % radarCategories.length],
  sourceType: r.kind === "paper" ? "arxiv" : "rss",
  kind: radarKinds[idx % radarKinds.length],
  tags: r.tags,
  hfUpvotes: idx === 0 ? 142 : idx === 1 ? 87 : null,
  externalId: r.externalId ?? null,
  // Higher score = ranks earlier in "Recommended"; deterministic for tests.
  score: Number((1.4 - idx * 0.07).toFixed(3)),
  resourceId: r.id,
}));

// Canned results for the Scholar-like search page in mock mode.
export const mockPaperHits: PaperHit[] = [
  {
    externalId: "arXiv:1706.03762", doi: null, arxivId: "1706.03762",
    source: "arxiv", url: "https://arxiv.org/abs/1706.03762",
    title: "Attention Is All You Need",
    abstract: "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms…",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
    year: 2017, venue: "NeurIPS", citationCount: 120000,
    pdfUrl: "https://arxiv.org/pdf/1706.03762",
  },
  {
    externalId: "DOI:10.1145/3580305.3599835", doi: "10.1145/3580305.3599835", arxivId: null,
    source: "openalex", url: "https://doi.org/10.1145/3580305.3599835",
    title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
    abstract: "Toolformer is a model trained to decide which APIs to call, when to call them and how…",
    authors: ["Timo Schick", "Jane Dwivedi-Yu"],
    year: 2023, venue: "ICML", citationCount: 1800,
    pdfUrl: null,
  },
  {
    externalId: "arXiv:2305.18290", doi: null, arxivId: "2305.18290",
    source: "semanticScholar", url: "https://arxiv.org/abs/2305.18290",
    title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    abstract: "DPO reparameterizes RLHF as a simple classification loss over preference pairs…",
    authors: ["Rafael Rafailov", "Archit Sharma"],
    year: 2023, venue: "NeurIPS", citationCount: 2200,
    pdfUrl: "https://arxiv.org/pdf/2305.18290",
  },
];

export const mockQuizzes: Quiz[] = [
  {
    id: id("how-llms-work-mcq"), slug: "how-llms-work-mcq",
    title: "How LLMs work — quick check",
    description: "5 questions to make sure the basics stick.",
    topicId: id("how-llms-work"), difficulty: "beginner",
    estimatedMinutes: 5,
    questions: [
      { id: "q1", kind: "mcq",
        prompt: "What does an LLM actually predict, one step at a time?",
        options: ["The next character", "The next token", "The next sentence", "The most relevant document"],
        answerIndex: 1,
        explanation: "LLMs are next-token predictors. Tokens are roughly 4 characters of English." },
      { id: "q2", kind: "mcq",
        prompt: "Roughly how many characters of English fit in one token?",
        options: ["1", "4", "16", "100"], answerIndex: 1,
        explanation: "About 4 characters per token on average for English." },
      { id: "q3", kind: "mcq",
        prompt: "Higher temperature usually means…",
        options: ["More deterministic output", "More diverse output", "Lower cost", "Faster response"],
        answerIndex: 1, explanation: "Temperature controls sampling randomness." },
      { id: "q4", kind: "mcq",
        prompt: "Which of these is NOT typically driven by tokenization?",
        options: ["Cost", "Latency", "Context window limits", "Display font"],
        answerIndex: 3, explanation: "Font is purely a UI choice." },
      { id: "q5", kind: "mcq",
        prompt: "If a model has a 128k context window, that limit is in…",
        options: ["Characters", "Tokens", "Words", "Megabytes"],
        answerIndex: 1, explanation: "Context windows are measured in tokens." },
    ],
  },
  {
    id: id("embeddings-flashcards"), slug: "embeddings-flashcards",
    title: "Embeddings flashcards",
    description: "6 flashcards covering the core embedding concepts.",
    topicId: id("embeddings-101"), difficulty: "beginner",
    estimatedMinutes: 5,
    questions: [
      { id: "f1", kind: "flashcard", prompt: "What does an embedding represent?",
        answer: "A position in a high-dimensional vector space whose distance approximates semantic similarity." },
      { id: "f2", kind: "flashcard", prompt: "Why cosine similarity?",
        answer: "It compares the direction of two vectors and ignores magnitude — useful when only meaning, not length, matters." },
      { id: "f3", kind: "flashcard", prompt: "What is pgvector?",
        answer: "A Postgres extension that stores and indexes vector embeddings for similarity search." },
      { id: "f4", kind: "flashcard", prompt: "What is RAG in one sentence?",
        answer: "Retrieve relevant chunks via similarity search, then put them in the prompt before generation." },
      { id: "f5", kind: "flashcard", prompt: "Trade-off of ivfflat vs hnsw indexes?",
        answer: "ivfflat: faster build, lower recall; hnsw: slower build, higher recall and faster queries." },
      { id: "f6", kind: "flashcard", prompt: "Why might similarity alone be insufficient?",
        answer: "Retrieval can return semantically close but contextually wrong chunks; a re-ranker or filter helps." },
    ],
  },
];

export const mockBuildLab: BuildLabItem[] = [
  {
    id: id("cursor-feature-spike"), slug: "cursor-feature-spike",
    title: "Cursor — feature spike prompt",
    summary: "A reusable prompt to scope and spike a new feature inside a repo.",
    kind: "prompt",
    bodyMd:
`You are working in <repo>. I want to spike <feature>.

Deliverables:
1. A short proposed design (3-5 bullets).
2. The minimal file changes needed for a working prototype.
3. A checklist of follow-ups.

Constraints: keep edits focused, avoid renaming files, add TODOs where you stub things.`,
    tags: ["cursor", "prompt", "feature"], topicIds: [],
    author: "internal", position: 1,
  },
  {
    id: id("cursor-refactor-prompt"), slug: "cursor-refactor-prompt",
    title: "Cursor — safe refactor prompt",
    summary: "Refactor with guardrails: scope, test, and reversibility.",
    kind: "prompt",
    bodyMd:
`Refactor <module> to <goal>.

Rules:
- No behaviour changes.
- Smallest possible diff.
- Update or add tests for any non-trivial change.
- Surface anything risky in a "Heads up" section at the end.`,
    tags: ["cursor", "prompt", "refactor"], topicIds: [],
    author: "internal", position: 2,
  },
  {
    id: id("chatbot-launch-playbook"), slug: "chatbot-launch-playbook",
    title: "Launching an internal chatbot — playbook",
    summary: "A 10-step playbook from problem framing to v1 launch.",
    kind: "playbook",
    bodyMd:
`## 1. Problem
What user pain are we removing?

## 2. Scope
What is in / out?

## 3. Data
What is the corpus? Where does it live?

## 4. Retrieval
Naive RAG first. Measure.

## 5. Prompt
System prompt + tool defs.

## 6. Evals
Gold set + rubric.

## 7. UI
Lean, no bells.

## 8. Guardrails
PII, refusals, abuse.

## 9. Telemetry
Log inputs, outputs, scores.

## 10. Launch
Canary → broad rollout.`,
    tags: ["chatbot", "playbook", "launch"], topicIds: [],
    author: "internal", position: 3,
  },
  {
    id: id("product-prd-template"), slug: "product-prd-template",
    title: "AI feature PRD template",
    summary: "A small PRD tailored to AI features: jobs-to-be-done, success criteria, eval plan.",
    kind: "template",
    bodyMd:
`# <Feature Name>

## Problem
## Users & jobs
## Success criteria
## Solution sketch
## Risks
## Eval plan
## Open questions`,
    tags: ["prd", "template", "product"], topicIds: [],
    author: "internal", position: 4,
  },
  {
    id: id("ship-checklist"), slug: "ship-checklist",
    title: "Ship-an-AI-feature checklist",
    summary: "Checks before we let real users hit your new AI feature.",
    kind: "checklist",
    bodyMd:
`- [ ] System prompt reviewed
- [ ] Tool schemas validated
- [ ] Prompt + retrieval evals exist
- [ ] PII / abuse guardrails in place
- [ ] Cost ceiling configured
- [ ] Logging + tracing on
- [ ] Rollout plan (canary → broad)
- [ ] Rollback plan documented`,
    tags: ["checklist", "ship", "quality"], topicIds: [],
    author: "internal", position: 5,
  },
];

// Library + notes are user-scoped; the mock implementation keeps these in-memory.
export const mockSavedItems: SavedItem[] = [];
export const mockNotes: Note[] = [];

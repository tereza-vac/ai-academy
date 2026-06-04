/**
 * Mock data for the MVP. Mirrors the Supabase seed in `supabase/seed/*.sql`
 * so the app works identically whether running on Supabase or in mock mode.
 *
 * IDs are stable strings (not UUIDs) so they're easy to read in URLs.
 */
import type {
  BasecampProject,
  BasecampRecording,
  BuildLabItem,
  Note,
  PaperHit,
  Quiz,
  LlmModel,
  RadarItem,
  Resource,
  SavedItem,
  Topic,
  Track,
} from "@/types/domain";
import type {
  ContentBlock,
  ResourceContent,
} from "@/types/blocks";

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
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
  },
  {
    id: id("res-claude-3"), url: "https://www.anthropic.com/news/claude-3-family",
    title: "Introducing the Claude 3 model family", sourceName: "Anthropic", kind: "release",
    summary: "Announcement of Claude 3 Haiku, Sonnet and Opus, with benchmarks and use-cases.",
    author: "Anthropic", publishedAt: "2024-03-04T00:00:00Z", imageUrl: null,
    tags: ["claude", "anthropic", "models"], topicIds: [],
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
  },
  {
    id: id("res-react"), url: "https://arxiv.org/abs/2210.03629",
    title: "ReAct: Synergizing Reasoning and Acting in Language Models",
    sourceName: "arXiv", kind: "paper",
    summary: "The original ReAct paper. Combines chain-of-thought reasoning with tool use.",
    author: "Yao et al.", publishedAt: "2022-10-06T00:00:00Z", imageUrl: null,
    tags: ["agents", "react", "tools"],
    topicIds: [id("tools-and-function-calling"), id("multi-step-agents")],
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
  },
  {
    id: id("res-cursor-agent"), url: "https://docs.cursor.com/agent",
    title: "Cursor Agent documentation", sourceName: "Cursor", kind: "article",
    summary: "How the Cursor agent works: tools, rules, modes and best practices.",
    author: "Cursor", publishedAt: "2025-01-15T00:00:00Z", imageUrl: null,
    tags: ["cursor", "agents", "docs"], topicIds: [id("cursor-day-one")],
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
  },
  {
    id: id("res-supabase-ai"), url: "https://supabase.com/docs/guides/ai",
    title: "Supabase AI & Vectors", sourceName: "Supabase", kind: "article",
    summary: "Using pgvector with Supabase: storage, indexing and similarity search.",
    author: "Supabase", publishedAt: "2024-08-01T00:00:00Z", imageUrl: null,
    tags: ["pgvector", "supabase", "rag"],
    topicIds: [id("rag-in-an-hour"), id("embeddings-101")],
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
  },
  {
    id: id("res-evals"), url: "https://hamel.dev/blog/posts/evals/",
    title: "Your AI product needs evals", sourceName: "hamel.dev", kind: "article",
    summary: "A pragmatic case for building evals before optimising prompts.",
    author: "Hamel Husain", publishedAt: "2024-03-21T00:00:00Z", imageUrl: null,
    tags: ["evals", "quality", "blog"], topicIds: [id("evals-that-matter")],
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
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
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
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
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
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
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
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
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
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
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
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
    enrichmentStatus: "manual", availability: "metadata_only", sourceLang: "en",
    externalId: "arXiv:2005.11401",
    isCanonical: true, canonicalCategory: "rag", canonicalPosition: 1,
  },
];

// Merge canonical papers into the main mock list so save/lookup works.
mockResources.push(...mockCanonicalResources);

const fetched = "2026-06-01T08:00:00Z";

export const mockLlmModels: LlmModel[] = [
  {
    id: id("llm-gpt-4o"), slug: "openai-gpt-4o", name: "GPT-4o", provider: "OpenAI", family: "GPT-4",
    licenseType: "commercial", modalities: ["text", "image"], contextWindow: 128000,
    parameterCount: null, releaseDate: "2024-05-13", fetchedAt: fetched,
    summary: "Flagship multimodal model from OpenAI — fast, capable, widely deployed.",
    descriptionMd: "## Overview\n\nGPT-4o is OpenAI's **omni** model for reasoning, vision, and tool use.",
    typicalUseCases: ["Assistants", "Vision QA", "Agents", "Code review"],
    strengths: ["Strong general reasoning", "Multimodal", "Mature ecosystem"],
    limitations: ["Closed weights", "Usage-based cost at scale"],
    tags: ["flagship", "multimodal"], homepageUrl: "https://openai.com/gpt-4o",
    docsUrl: "https://platform.openai.com/docs/models/gpt-4o", pricingHint: "Paid API",
    isNiche: false, popularityTier: "mainstream", externalId: "openai/gpt-4o", source: "curated", score: 100,
  },
  {
    id: id("llm-claude-sonnet"), slug: "anthropic-claude-sonnet-4", name: "Claude Sonnet 4",
    provider: "Anthropic", family: "Claude", licenseType: "commercial", modalities: ["text", "image"],
    contextWindow: 200000, parameterCount: null, releaseDate: "2025-05-14", fetchedAt: fetched,
    summary: "Balanced Claude model — strong coding and analysis with a large context window.",
    descriptionMd: "## Overview\n\nSonnet sits between Haiku and Opus — popular for **coding agents**.",
    typicalUseCases: ["Code generation", "Long document analysis", "Research assistants"],
    strengths: ["Excellent coding", "200k context"], limitations: ["Commercial only"],
    tags: ["coding", "long-context"], homepageUrl: "https://www.anthropic.com/claude",
    docsUrl: "https://docs.anthropic.com", pricingHint: "Paid API",
    isNiche: false, popularityTier: "mainstream", externalId: "anthropic/claude-sonnet-4", source: "curated", score: 98,
  },
  {
    id: id("llm-llama"), slug: "meta-llama-3-3-70b", name: "Llama 3.3 70B", provider: "Meta", family: "Llama",
    licenseType: "open_source", modalities: ["text"], contextWindow: 128000, parameterCount: "70B",
    releaseDate: "2024-12-06", fetchedAt: fetched,
    summary: "Open-weight Llama release competitive with many closed models.",
    descriptionMd: "## Overview\n\nSelf-host, fine-tune, or run via hosted APIs.",
    typicalUseCases: ["On-prem assistants", "Fine-tuning", "Research"],
    strengths: ["Open weights", "Large community"], limitations: ["Self-host GPU cost"],
    tags: ["open-weights"], homepageUrl: "https://llama.meta.com/", docsUrl: "https://github.com/meta-llama",
    pricingHint: "Free weights / paid hosting", isNiche: false, popularityTier: "mainstream",
    externalId: "meta-llama/Llama-3.3-70B-Instruct", source: "curated", score: 90,
  },
  {
    id: id("llm-deepseek"), slug: "deepseek-deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek",
    family: "DeepSeek", licenseType: "open_source", modalities: ["text"], contextWindow: 65536,
    parameterCount: "671B MoE", releaseDate: "2024-12-26", fetchedAt: fetched,
    summary: "MoE open model with exceptional price/performance.",
    descriptionMd: "## Overview\n\nStrong reasoning at fraction of frontier API cost.",
    typicalUseCases: ["Cost-sensitive reasoning", "Coding"], strengths: ["Excellent value"],
    limitations: ["Compliance scrutiny in some orgs"], tags: ["moe", "value"],
    homepageUrl: "https://www.deepseek.com/", docsUrl: "https://huggingface.co/deepseek-ai",
    pricingHint: "API + weights", isNiche: false, popularityTier: "mainstream",
    externalId: "deepseek/deepseek-chat", source: "curated", score: 88,
  },
  {
    id: id("llm-phi"), slug: "microsoft-phi-4", name: "Phi-4", provider: "Microsoft", family: "Phi",
    licenseType: "open_source", modalities: ["text"], contextWindow: 16384, parameterCount: "14B",
    releaseDate: "2024-12-12", fetchedAt: fetched,
    summary: "Small language model optimized for reasoning on modest hardware.",
    descriptionMd: "## Overview\n\nPhi-4 punches above its size on math and logic.",
    typicalUseCases: ["Edge deployment", "STEM tutoring"], strengths: ["Tiny footprint"],
    limitations: ["Not for frontier creative writing"], tags: ["slm", "edge"],
    homepageUrl: "https://azure.microsoft.com/en-us/products/phi",
    docsUrl: "https://huggingface.co/microsoft", pricingHint: "Free weights",
    isNiche: false, popularityTier: "emerging", externalId: "microsoft/phi-4", source: "curated", score: 70,
  },
  {
    id: id("llm-jamba"), slug: "ai21-jamba-1-5-large", name: "Jamba 1.5 Large", provider: "AI21 Labs",
    family: "Jamba", licenseType: "commercial", modalities: ["text"], contextWindow: 256000,
    parameterCount: null, releaseDate: "2024-08-22", fetchedAt: fetched,
    summary: "Hybrid SSM-Transformer for very long documents.",
    descriptionMd: "## Overview\n\nMamba + attention hybrid architecture.",
    typicalUseCases: ["Legal doc review", "Book-length summarization"],
    strengths: ["256k context"], limitations: ["Smaller ecosystem"],
    tags: ["long-context", "hybrid-arch"], homepageUrl: "https://www.ai21.com/",
    docsUrl: "https://docs.ai21.com", pricingHint: "Paid API", isNiche: true, popularityTier: "niche",
    externalId: "ai21/jamba-1.5-large", source: "curated", score: 55,
  },
  {
    id: id("llm-mixtral"), slug: "mistral-mixtral-8x7b", name: "Mixtral 8x7B", provider: "Mistral",
    family: "Mixtral", licenseType: "open_source", modalities: ["text"], contextWindow: 32768,
    parameterCount: "8x7B MoE", releaseDate: "2023-12-11", fetchedAt: fetched,
    summary: "Sparse MoE open model — efficient for its quality class.",
    descriptionMd: "## Overview\n\nOnly a subset of experts activate per token.",
    typicalUseCases: ["Self-hosted chat", "Cost-sensitive OSS"], strengths: ["MoE efficiency"],
    limitations: ["Smaller context than modern flagships"], tags: ["moe"],
    homepageUrl: "https://mistral.ai/news/mixtral-of-experts/",
    docsUrl: "https://huggingface.co/mistralai", pricingHint: "Free weights",
    isNiche: false, popularityTier: "emerging", externalId: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    source: "curated", score: 75,
  },
  {
    id: id("llm-ollama"), slug: "local-ollama-template", name: "Ollama (local runner)",
    provider: "Ollama", family: "Runtime", licenseType: "open_source", modalities: ["text"],
    contextWindow: null, parameterCount: null, releaseDate: "2023-06-01", fetchedAt: fetched,
    summary: "Runtime to pull and run open models locally.",
    descriptionMd: "## Overview\n\nOne-command local models for prototyping.",
    typicalUseCases: ["Local prototyping", "Air-gapped demos"],
    strengths: ["Huge catalog of pulls"], limitations: ["No hosted SLA"],
    tags: ["local", "devtools"], homepageUrl: "https://ollama.com/",
    docsUrl: "https://github.com/ollama/ollama", pricingHint: "Free software",
    isNiche: false, popularityTier: "emerging", externalId: null, source: "curated", score: 78,
  },
];

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

// ---------------------------------------------------------------------------
// Internal reader fixtures
//
// One canonical paper gets a fully-imported block list so the reader page can
// be opened in mock mode end-to-end. The rest stay at `metadata_only` (their
// default) so cards show only [Save] [Original].
// ---------------------------------------------------------------------------
const _attentionId = id("res-attention-is-all-you-need");

// Bump the canonical Attention paper to full_text_api so its card surfaces
// the "Read in AI Academy" button in mock mode.
{
  const r = mockResources.find((x) => x.id === _attentionId);
  if (r) {
    r.availability = "full_text_api";
    r.sourceLang = "en";
  }
}

export const mockResourceContents: ResourceContent[] = [
  {
    resourceId: _attentionId,
    sourceUrl: "https://ar5iv.org/abs/1706.03762",
    sourceLang: "en",
    license: "arxiv-nonexclusive",
    importer: "arxiv-ar5iv",
    importerVersion: 1,
    wordCount: 412,
    hasEquations: true,
    hasTables: false,
    lastImportedAt: "2026-05-20T10:00:00Z",
    rawMeta: { arxivId: "1706.03762" },
  },
];

export const mockResourceBlocks: ContentBlock[] = [
  {
    id: "mock-block-1",
    resourceId: _attentionId,
    blockUid: "h1-1",
    position: 0,
    type: "heading",
    payload: { type: "heading", level: 1, text: "Attention Is All You Need" },
    textHash: "mock-hash-1",
  },
  {
    id: "mock-block-2",
    resourceId: _attentionId,
    blockUid: "p-abstract",
    position: 1,
    type: "paragraph",
    payload: {
      type: "paragraph",
      text:
        "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    },
    textHash: "mock-hash-2",
  },
  {
    id: "mock-block-3",
    resourceId: _attentionId,
    blockUid: "h2-1",
    position: 2,
    type: "heading",
    payload: { type: "heading", level: 2, text: "Scaled dot-product attention" },
    textHash: "mock-hash-3",
  },
  {
    id: "mock-block-4",
    resourceId: _attentionId,
    blockUid: "eq-1",
    position: 3,
    type: "equation",
    payload: {
      type: "equation",
      tex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right) V",
      display: true,
    },
    textHash: "mock-hash-4",
  },
  {
    id: "mock-block-5",
    resourceId: _attentionId,
    blockUid: "p-attn-explanation",
    position: 4,
    type: "paragraph",
    payload: {
      type: "paragraph",
      text:
        "The two most commonly used attention functions are additive attention and dot-product (multiplicative) attention. Dot-product attention is much faster and more space-efficient in practice, since it can be implemented using highly optimized matrix multiplication code.",
    },
    textHash: "mock-hash-5",
  },
  {
    id: "mock-block-6",
    resourceId: _attentionId,
    blockUid: "list-1",
    position: 5,
    type: "list",
    payload: {
      type: "list",
      ordered: false,
      items: [
        "Multi-head attention lets the model jointly attend to information from different representation subspaces.",
        "Positional encodings add information about token order, since the model has no recurrence.",
        "The Transformer trains significantly faster than recurrent or convolutional architectures.",
      ],
    },
    textHash: "mock-hash-6",
  },
];

/* -------------------------------------------------------------------------- */
/* Basecamp integration                                                        */
/* -------------------------------------------------------------------------- */
// Modeled after the screenshot the user shared: two AI-tagged projects sit
// alongside a few non-AI ones so the "AI only" filter has something to do.

const _bcDay = (offsetDays: number) =>
  new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString();

export const mockBasecampProjects: BasecampProject[] = [
  {
    id: "bc-project-ai-grammar",
    basecampId: 41001001,
    name: "Umělá inteligence, jak s ní žít — AI gramotnost",
    description:
      "*** Jak pro svět s AI připravovat děti. *** Obavy, rizika a strachy kolem AI a jak s nimi pracovat ve školách.",
    purpose: "topic",
    status: "active",
    url: "https://3.basecamp.com/4111111/projects/41001001",
    appUrl: "https://3.basecamp.com/4111111/buckets/41001001",
    isAiRelevant: true,
    manualVisibility: null,
    lastActiveAt: _bcDay(0.5),
    ingestedAt: _bcDay(0),
  },
  {
    id: "bc-project-ai-work",
    basecampId: 41001002,
    name: "Umělá inteligence AI a práce s ní",
    description:
      "Toto je místo pro všechny, kdo chtějí prakticky používat AI v denní práci. Sdílíme tipy, prompty a postřehy z praxe.",
    purpose: "topic",
    status: "active",
    url: "https://3.basecamp.com/4111111/projects/41001002",
    appUrl: "https://3.basecamp.com/4111111/buckets/41001002",
    isAiRelevant: true,
    manualVisibility: null,
    lastActiveAt: _bcDay(1.1),
    ingestedAt: _bcDay(0),
  },
  {
    id: "bc-project-sciopolis",
    basecampId: 41001003,
    name: "ScioPolis nepracovní",
    description:
      "Toto je místo pro cokoli nepracovního. Hledáte parťáky na běh, výlet, kafe nebo lyže? Sem s tím.",
    purpose: "topic",
    status: "active",
    url: "https://3.basecamp.com/4111111/projects/41001003",
    appUrl: "https://3.basecamp.com/4111111/buckets/41001003",
    isAiRelevant: false,
    manualVisibility: null,
    lastActiveAt: _bcDay(0.3),
    ingestedAt: _bcDay(0),
  },
  {
    id: "bc-project-studia",
    basecampId: 41001004,
    name: "Studia",
    description:
      "Hlavní komunikační kanál Studií pro zápisy z porad, informace o BR a další provozní věci.",
    purpose: "topic",
    status: "active",
    url: "https://3.basecamp.com/4111111/projects/41001004",
    appUrl: "https://3.basecamp.com/4111111/buckets/41001004",
    isAiRelevant: false,
    manualVisibility: null,
    lastActiveAt: _bcDay(2.0),
    ingestedAt: _bcDay(0),
  },
];

export const mockBasecampRecordings: BasecampRecording[] = [
  {
    id: "bc-rec-1",
    projectId: "bc-project-ai-work",
    kind: "message",
    title: "Týdenní AI tipy — týden 22",
    excerpt:
      "Pět nejzajímavějších promptů z minulého týdne, plus krátký návod, jak je upravit pro vaši doménu.",
    contentHtml: null,
    authorName: "Linda F.",
    authorAvatarUrl: null,
    url: "https://3.basecamp.com/4111111/buckets/41001002/messages/9001",
    postedAt: _bcDay(0.5),
    editedAt: _bcDay(0.5),
  },
  {
    id: "bc-rec-2",
    projectId: "bc-project-ai-work",
    kind: "comment",
    title: null,
    excerpt:
      "Souhlas, ten poslední prompt na shrnutí mailů funguje skvěle i v češtině. Přihazuju jednu úpravu pro Outlook.",
    contentHtml: null,
    authorName: "Jan K.",
    authorAvatarUrl: null,
    url: "https://3.basecamp.com/4111111/buckets/41001002/comments/9002",
    postedAt: _bcDay(0.7),
    editedAt: _bcDay(0.7),
  },
  {
    id: "bc-rec-3",
    projectId: "bc-project-ai-work",
    kind: "todo",
    title: "Zveřejnit playbook „AI pro psaní e-mailů“",
    excerpt: "Doplnit screenshoty a publikovat v Knihovně do pátku.",
    contentHtml: null,
    authorName: "Tereza H.",
    authorAvatarUrl: null,
    url: "https://3.basecamp.com/4111111/buckets/41001002/todos/9003",
    postedAt: _bcDay(1.5),
    editedAt: _bcDay(1.5),
  },
  {
    id: "bc-rec-4",
    projectId: "bc-project-ai-grammar",
    kind: "message",
    title: "Pozvánka — Outdoor tábor a Teen Outdoor",
    excerpt:
      "Workshop „Jak učit AI gramotnost na ZŠ“. Termín, cílovka, pomůcky a krátký draft osnovy.",
    contentHtml: null,
    authorName: "Tereza H.",
    authorAvatarUrl: null,
    url: "https://3.basecamp.com/4111111/buckets/41001001/messages/9004",
    postedAt: _bcDay(0.45),
    editedAt: _bcDay(0.45),
  },
  {
    id: "bc-rec-5",
    projectId: "bc-project-ai-grammar",
    kind: "todo",
    title: "Připravit pracovní list o halucinacích",
    excerpt:
      "Pro 8.–9. třídu, 45 min, s cvičením „rozpoznej halucinaci v odpovědi modelu“.",
    contentHtml: null,
    authorName: "Michael L.",
    authorAvatarUrl: null,
    url: "https://3.basecamp.com/4111111/buckets/41001001/todos/9005",
    postedAt: _bcDay(2.2),
    editedAt: _bcDay(2.2),
  },
  {
    id: "bc-rec-6",
    projectId: "bc-project-sciopolis",
    kind: "message",
    title: "Páteční oběd — kdo jde?",
    excerpt:
      "Tradiční páteční výpadek do bistra na rohu. Sraz v 12:30 ve foyer.",
    contentHtml: null,
    authorName: "Zuzana H.",
    authorAvatarUrl: null,
    url: "https://3.basecamp.com/4111111/buckets/41001003/messages/9006",
    postedAt: _bcDay(0.35),
    editedAt: _bcDay(0.35),
  },
  {
    id: "bc-rec-7",
    projectId: "bc-project-studia",
    kind: "document",
    title: "Zápis z porady — 26. 5.",
    excerpt:
      "Hlavní body: rozpočet H2, plán pilotů, AI v testování. Plné znění v dokumentu.",
    contentHtml: null,
    authorName: "Michael L.",
    authorAvatarUrl: null,
    url: "https://3.basecamp.com/4111111/buckets/41001004/documents/9007",
    postedAt: _bcDay(2.0),
    editedAt: _bcDay(2.0),
  },
];

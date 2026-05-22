import type { NamespaceContentTranslation } from "../../i18n-types";

const en_content: NamespaceContentTranslation = {
  tracks: {
    foundations: {
      title: "Foundations",
      description: "Core ideas: tokens, embeddings, transformers and what an LLM actually does.",
    },
    prompting: {
      title: "Prompting",
      description: "Practical prompting patterns, system prompts and structured output.",
    },
    building: {
      title: "Building with AI",
      description: "Cursor, RAG, evals and shipping AI features.",
    },
    agents: {
      title: "Agents & Workflows",
      description: "Tools, multi-step reasoning and orchestration patterns.",
    },
  },
  topics: {
    howLlmsWork: {
      title: "How LLMs actually work",
      summary: "A short tour from tokens to next-token prediction.",
      body: "## What is a token?\n\nLLMs see text as **tokens**, not characters. A token is roughly 4 characters of English.\n\n## Next-token prediction\n\nGiven a sequence of tokens, the model predicts the most likely next token. That single mechanic - repeated - produces everything you see in chat output.\n\n## Why this matters\n\nUnderstanding this explains:\n\n- why tokens and tokenization drive cost and latency,\n- why prompts and context windows have limits,\n- why temperature changes output diversity.",
    },
    embeddings101: {
      title: "Embeddings 101",
      summary: "Vectors that capture meaning. The basis of search and RAG.",
      body: "Embeddings turn text into a vector of floats. Similar meaning means closeness in vector space.\n\n## When to use them\n\n- Semantic search\n- Clustering\n- Recommendations\n- Retrieval-Augmented Generation (RAG)",
    },
    systemPrompts: {
      title: "System prompts that hold up",
      summary: "Structure, role, constraints, examples and refusals.",
      body: "A system prompt sets durable behaviour. Treat it like product copy: precise, testable, and small enough to fit in your head.\n\n## Skeleton\n\n```\nRole\nContext\nTask\nConstraints\nOutput format\n```",
    },
    structuredOutput: {
      title: "Structured output (JSON, tools, schemas)",
      summary: "When you want machines to consume model output.",
      body: "When the consumer is another program, prefer structured output:\n\n- JSON mode\n- Tool / function calling\n- Strict schemas (Zod, JSON Schema)",
    },
    cursorDayOne: {
      title: "Cursor on day one",
      summary: "Setup, .cursor/rules, models and the agent loop.",
      body: "## Install\n\nDownload Cursor and sign in. Set your default model.\n\n## Project rules\n\nCreate `.cursor/rules/your-rule.md` to give the agent persistent guidance for this repo.",
    },
    ragInAnHour: {
      title: "RAG in an hour",
      summary: "Chunking, embeddings, similarity search, re-ranking, prompting.",
      body: "## The pipeline\n\n1. Chunk\n2. Embed\n3. Store\n4. Retrieve\n5. (Re-rank)\n6. Prompt with context",
    },
    evalsThatMatter: {
      title: "Evals that matter",
      summary: "From spreadsheet-graded prompts to automated scoring.",
      body: "Three kinds of evals you actually need:\n\n- **Reference-based** - gold answer comparison.\n- **Rubric-based** - a small LLM judge with a rubric.\n- **A/B in production** - measure user behaviour.",
    },
    toolsAndFunctionCalling: {
      title: "Tools & function calling",
      summary: "Give a model verbs. Then bound what it can do.",
      body: "Tools turn an LLM into something that can act. Define a JSON schema, the model fills it in, your code runs it.",
    },
    multiStepAgents: {
      title: "Multi-step agents",
      summary: "Planning, memory, retries and when to give up.",
      body: "A short overview of:\n\n- ReAct\n- Plan-and-execute\n- Reflection\n- Hand-offs",
    },
    agentEvals: {
      title: "Evaluating agents",
      summary: "Trace, score, and improve multi-step systems.",
      body: "Single-shot prompt evals don't cover agents. You need trajectory evals.",
    },
  },
  resources: {
    gpt4: {
      title: "GPT-4 technical report",
      summary: "Technical report describing GPT-4's capabilities and limitations.",
    },
    claude3: {
      title: "Introducing the Claude 3 model family",
      summary: "Announcement of Claude 3 Haiku, Sonnet and Opus, with benchmarks and use-cases.",
    },
    react: {
      title: "ReAct: Synergizing Reasoning and Acting in Language Models",
      summary: "The original ReAct paper. Combines chain-of-thought reasoning with tool use.",
    },
    cursorAgent: {
      title: "Cursor Agent documentation",
      summary: "How the Cursor agent works: tools, rules, modes and best practices.",
    },
    supabaseAi: {
      title: "Supabase AI & Vectors",
      summary: "Using pgvector with Supabase: storage, indexing and similarity search.",
    },
    evals: {
      title: "Your AI product needs evals",
      summary: "A pragmatic case for building evals before optimising prompts.",
    },
  },
  quizzes: {
    howLlmsWorkMcq: {
      title: "How LLMs work - quick check",
      description: "5 questions to make sure the basics stick.",
      q1: {
        prompt: "What does an LLM actually predict, one step at a time?",
        o1: "The next character",
        o2: "The next token",
        o3: "The next sentence",
        o4: "The most relevant document",
        explanation: "LLMs are next-token predictors. Tokens are roughly 4 characters of English.",
      },
      q2: {
        prompt: "Roughly how many characters of English fit in one token?",
        o1: "1",
        o2: "4",
        o3: "16",
        o4: "100",
        explanation: "About 4 characters per token on average for English.",
      },
      q3: {
        prompt: "Higher temperature usually means...",
        o1: "More deterministic output",
        o2: "More diverse output",
        o3: "Lower cost",
        o4: "Faster response",
        explanation: "Temperature controls sampling randomness.",
      },
      q4: {
        prompt: "Which of these is NOT typically driven by tokenization?",
        o1: "Cost",
        o2: "Latency",
        o3: "Context window limits",
        o4: "Display font",
        explanation: "Font is purely a UI choice.",
      },
      q5: {
        prompt: "If a model has a 128k context window, that limit is in...",
        o1: "Characters",
        o2: "Tokens",
        o3: "Words",
        o4: "Megabytes",
        explanation: "Context windows are measured in tokens.",
      },
    },
    embeddingsFlashcards: {
      title: "Embeddings flashcards",
      description: "6 flashcards covering the core embedding concepts.",
      f1: {
        prompt: "What does an embedding represent?",
        answer: "A position in a high-dimensional vector space whose distance approximates semantic similarity.",
      },
      f2: {
        prompt: "Why cosine similarity?",
        answer: "It compares the direction of two vectors and ignores magnitude - useful when only meaning, not length, matters.",
      },
      f3: {
        prompt: "What is pgvector?",
        answer: "A Postgres extension that stores and indexes vector embeddings for similarity search.",
      },
      f4: {
        prompt: "What is RAG in one sentence?",
        answer: "Retrieve relevant chunks via similarity search, then put them in the prompt before generation.",
      },
      f5: {
        prompt: "Trade-off of ivfflat vs hnsw indexes?",
        answer: "ivfflat: faster build, lower recall; hnsw: slower build, higher recall and faster queries.",
      },
      f6: {
        prompt: "Why might similarity alone be insufficient?",
        answer: "Retrieval can return semantically close but contextually wrong chunks; a re-ranker or filter helps.",
      },
    },
  },
  buildLabItems: {
    cursorFeatureSpike: {
      title: "Cursor - feature spike prompt",
      summary: "A reusable prompt to scope and spike a new feature inside a repo.",
      body: "You are working in <repo>. I want to spike <feature>.\n\nDeliverables:\n1. A short proposed design (3-5 bullets).\n2. The minimal file changes needed for a working prototype.\n3. A checklist of follow-ups.\n\nConstraints: keep edits focused, avoid renaming files, add TODOs where you stub things.",
    },
    cursorRefactorPrompt: {
      title: "Cursor - safe refactor prompt",
      summary: "Refactor with guardrails: scope, test, and reversibility.",
      body: "Refactor <module> to <goal>.\n\nRules:\n- No behaviour changes.\n- Smallest possible diff.\n- Update or add tests for any non-trivial change.\n- Surface anything risky in a \"Heads up\" section at the end.",
    },
    chatbotLaunchPlaybook: {
      title: "Launching an internal chatbot - playbook",
      summary: "A 10-step playbook from problem framing to v1 launch.",
      body: "## 1. Problem\nWhat user pain are we removing?\n\n## 2. Scope\nWhat is in / out?\n\n## 3. Data\nWhat is the corpus? Where does it live?\n\n## 4. Retrieval\nNaive RAG first. Measure.\n\n## 5. Prompt\nSystem prompt + tool defs.\n\n## 6. Evals\nGold set + rubric.\n\n## 7. UI\nLean, no bells.\n\n## 8. Guardrails\nPII, refusals, abuse.\n\n## 9. Telemetry\nLog inputs, outputs, scores.\n\n## 10. Launch\nCanary -> broad rollout.",
    },
    productPrdTemplate: {
      title: "AI feature PRD template",
      summary: "A small PRD tailored to AI features: jobs-to-be-done, success criteria, eval plan.",
      body: "# <Feature Name>\n\n## Problem\n## Users & jobs\n## Success criteria\n## Solution sketch\n## Risks\n## Eval plan\n## Open questions",
    },
    shipChecklist: {
      title: "Ship-an-AI-feature checklist",
      summary: "Checks before we let real users hit your new AI feature.",
      body: "- [ ] System prompt reviewed\n- [ ] Tool schemas validated\n- [ ] Prompt + retrieval evals exist\n- [ ] PII / abuse guardrails in place\n- [ ] Cost ceiling configured\n- [ ] Logging + tracing on\n- [ ] Rollout plan (canary -> broad)\n- [ ] Rollback plan documented",
    },
  },
  canon: {
    attentionIsAllYouNeed: {
      title: "Attention Is All You Need",
      summary: "The original Transformer paper. The foundation of modern LLMs.",
    },
    scalingLaws: {
      title: "Scaling Laws for Neural Language Models",
      summary: "OpenAI scaling laws: how model performance scales with data, parameters and compute.",
    },
    chinchilla: {
      title: "Chinchilla: Training Compute-Optimal LLMs",
      summary: "DeepMind shows most LLMs were data-undertrained for their compute budget.",
    },
    bert: {
      title: "BERT: Pre-training of Deep Bidirectional Transformers",
      summary: "Encoder-only model that popularized the pre-training / fine-tuning paradigm.",
    },
    gpt3: {
      title: "GPT-3: Language Models are Few-Shot Learners",
      summary: "Showed that scaling plus in-context learning unlocks emergent capabilities.",
    },
    llama: {
      title: "LLaMA: Open and Efficient Foundation Language Models",
      summary: "Meta releases a strong family of open models, kick-starting the open-source LLM ecosystem.",
    },
    mixtral: {
      title: "Mixtral of Experts",
      summary: "Mistral describes a sparse 8x7B mixture-of-experts model at GPT-3.5 quality for a fraction of the cost.",
    },
    instructgpt: {
      title: "InstructGPT: Training Language Models to Follow Instructions with Human Feedback",
      summary: "The paper behind ChatGPT: RLHF that taught GPT-3 to follow instructions.",
    },
    constitutionalAi: {
      title: "Constitutional AI: Harmlessness from AI Feedback",
      summary: "Anthropic demonstrates RLAIF: AI judges outputs against a written set of principles.",
    },
    dpo: {
      title: "Direct Preference Optimization",
      summary: "Train LLMs from preference pairs without an explicit reward model — simpler than RLHF.",
    },
    cot: {
      title: "Chain-of-Thought Prompting",
      summary: "Shows how prompts with intermediate reasoning steps improve multi-step reasoning in LLMs.",
    },
    react: {
      title: "ReAct: Synergizing Reasoning and Acting in Language Models",
      summary: "A canonical agent pattern: a language model alternates reasoning steps and tool calls.",
    },
    toolformer: {
      title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
      summary: "Meta shows how an LLM can self-acquire the ability to call external APIs.",
    },
    rag: {
      title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      summary: "The original RAG paper: combine retrieve + generate for knowledge-intensive tasks.",
    },
  },
};

export default en_content;

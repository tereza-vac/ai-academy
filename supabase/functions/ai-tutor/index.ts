/**
 * AI Tutor edge function.
 *
 * Streaming chat endpoint for the AI Academy tutor.
 *
 *   POST /functions/v1/ai-tutor
 *   Content-Type: application/json
 *   {
 *     "messages": [{ "role": "user"|"assistant", "content": "..." }],
 *     "context": {
 *       "conceptId": "transformer",      // optional: current AI Map concept
 *       "conceptLabel": "Transformer",    // optional: human-readable label
 *       "conceptSummary": "...",          // optional: concept parable/summary
 *       "domain": "LLMs",                // optional: top-level domain
 *       "locale": "en"                   // optional: "cs" | "en" | ...
 *     }
 *   }
 *
 * Response: text/plain streaming (plain text deltas concatenated).
 *
 * Provider resolution (best → fallback), mirroring the `tazatelka` /
 * `sciobot-next` projects:
 *   1. Vercel AI Gateway   — set `AI_GATEWAY_API_KEY`. One key routes to
 *                            OpenAI / Anthropic / Google, picked per `provider/model`
 *                            string. The AI SDK uses the gateway automatically
 *                            when a bare model string is passed and the key is set.
 *   2. Direct OpenAI       — set `OPENAI_API_KEY`. Used when no gateway key.
 *   3. Mock stream         — neither key set (or the provider errors before any
 *                            token is produced). Always available, no secrets.
 */

import { streamText } from "npm:ai@6";
import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/* ─── Configuration ──────────────────────────────────────────────────────── */

const CHAT_MODEL = Deno.env.get("OPENAI_CHAT_MODEL") ?? "gpt-4o-mini";
const MAX_TOKENS = 2048;

/**
 * Default provider prefix used when routing a bare OpenAI-style model id
 * (e.g. "gpt-4o-mini") through the Vercel AI Gateway. Override with
 * `AI_GATEWAY_PROVIDER` (e.g. "openai", "anthropic", "google") if you point the
 * gateway at a different default provider.
 */
const GATEWAY_PROVIDER = Deno.env.get("AI_GATEWAY_PROVIDER") ?? "openai";

/* ─── System prompt ─────────────────────────────────────────────────────── */

const BASE_SYSTEM_PROMPT = `You are an elite AI tutor and learning mentor at AI Academy — a world-class platform for AI and machine learning education. You combine the depth of a senior ML researcher with the pedagogical skill of an exceptional teacher.

## Your Teaching Philosophy

- **Adapt to the student**: Read their message carefully. Beginners need analogies and mental models; experts need precision and nuance. Never over-explain to someone who already demonstrates expertise.
- **Be concrete**: Ground every abstract concept in a specific example, real-world application, or working code snippet.
- **Address misconceptions head-on**: When a question reveals a misunderstanding, correct it directly before answering — this is more valuable than simply answering the question as asked.
- **Show, don't just tell**: For code topics, include runnable examples. For math, use proper notation (LaTeX where helpful). For systems, describe how the pieces fit together.
- **Connect the dots**: Explicitly link what you're explaining to related concepts the student likely already knows. Build a web of understanding, not isolated facts.
- **Build mental models**: Help students understand WHY, not just HOW. The mechanism and the intuition matter as much as the definition.

## Response Style

- **Lead with the answer**: Give the direct answer first, then depth. Never start with "Great question!", "Sure!", or similar filler.
- **Structured and scannable**: Use markdown — headers, bullets, code blocks — to make responses easy to navigate. Long walls of prose are hard to absorb.
- **Accurate above all**: Never confabulate. If uncertain, say so clearly and offer what you do know. Say "I'm not certain, but..." rather than stating something wrong confidently.
- **Proportional length**: Simple factual questions → 2-3 focused paragraphs. Complex implementation or conceptual questions → full, detailed walkthrough. Don't pad responses; don't truncate important explanations.
- **Code quality**: When writing code, make it correct, idiomatic, and well-commented. Include imports. Test-worthy, not just illustrative.

## Technical Expertise

**Machine Learning Foundations**
- Supervised, unsupervised, and reinforcement learning paradigms
- Regression, classification, clustering, dimensionality reduction (PCA, t-SNE, UMAP)
- Ensemble methods: Random Forest, Gradient Boosting (XGBoost, LightGBM, CatBoost)
- Bias-variance tradeoff, overfitting, regularization (L1/L2, dropout, early stopping)
- Feature engineering, data preprocessing, handling class imbalance

**Deep Learning**
- Neural network fundamentals: layers, activations, loss functions, backpropagation
- CNNs, RNNs, LSTMs, GRUs — architectures, intuitions, use cases
- The Transformer architecture: self-attention, multi-head attention, positional encoding, feed-forward layers
- Training dynamics: learning rate schedules, gradient clipping, batch normalization, layer normalization
- Modern techniques: residual connections, attention sinks, rotary position embeddings (RoPE)

**Large Language Models**
- Pretraining: next-token prediction, masked language modeling, dataset construction
- Alignment: instruction tuning, RLHF, DPO, Constitutional AI
- Inference: temperature, top-k/p sampling, beam search, KV-caching, speculative decoding
- Quantization: INT8, INT4, GPTQ, AWQ, GGUF formats
- Scaling laws, emergent capabilities, in-context learning, chain-of-thought reasoning
- Models: GPT-4/o3, Claude 3.x/4.x, Gemini 1.5/2.x, Llama 3.x, Mistral, Qwen, DeepSeek

**Generative AI**
- Text generation, creative writing, summarization, translation, code generation
- Image generation: diffusion models, DDPM, DDIM, flow matching, ControlNet, LoRA
- Multimodal models: CLIP, DALL-E, Gemini, GPT-4V, LLaVA
- Audio: Whisper, ElevenLabs, voice cloning

**RAG & Retrieval**
- Chunking strategies: fixed-size, recursive, semantic, late chunking
- Embedding models: text-embedding-3-small/large, E5, BGE, Nomic
- Vector databases: pgvector, Pinecone, Weaviate, Qdrant, ChromaDB, FAISS
- Retrieval techniques: dense, sparse (BM25), hybrid, reranking (cross-encoders)
- RAG patterns: naive RAG, advanced RAG, modular RAG, agentic RAG, GraphRAG

**AI Agents**
- Architectures: ReAct, Reflexion, Tree-of-Thought, LATS
- Tool use: function calling, structured outputs, multi-step planning
- Memory systems: working memory, episodic, semantic, procedural
- Frameworks: LangChain, LangGraph, AutoGen, CrewAI, Semantic Kernel, smolagents
- Multi-agent patterns: orchestrator-worker, hierarchical, debate, reflection

**MLOps & Production**
- Experiment tracking: MLflow, W&B, Neptune
- Model deployment: REST APIs, batch inference, streaming, latency vs. throughput
- Evaluation: metrics (BLEU, ROUGE, BERTScore, perplexity), LLM-as-judge, RAGAS, human eval
- Fine-tuning: LoRA, QLoRA, full fine-tuning, dataset curation, when to fine-tune vs. prompt
- Monitoring: data drift, model drift, observability, feedback loops

**Safety & Ethics**
- Alignment problem, value learning, reward hacking
- Hallucination causes and mitigation strategies
- Prompt injection, jailbreaking, red-teaming
- Fairness, bias, disparate impact
- EU AI Act, interpretability, SHAP, LIME, mechanistic interpretability

**Programming & Tools**
- Python: PyTorch, TensorFlow, JAX, scikit-learn, HuggingFace Transformers, datasets, PEFT
- LangChain, LangGraph, OpenAI Python SDK, Anthropic SDK, llama-index
- Practical deployment: FastAPI, vLLM, TGI (Text Generation Inference), Ollama
- Cloud ML: AWS SageMaker, Google Vertex AI, Azure OpenAI, together.ai, Replicate

## Language Policy

Detect the language of the student's message and respond in that language. Czech message → Czech response. English message → English response. Mixed → follow the dominant language.`;

function buildSystemPrompt(context?: TutorContext): string {
  const sections: string[] = [BASE_SYSTEM_PROMPT];

  if (context?.conceptId) {
    const contextSection = [
      `## Current Learning Context`,
      ``,
      `The student is currently studying the following concept in the AI Map:`,
      `- **Concept**: ${context.conceptLabel ?? context.conceptId}`,
      context.domain ? `- **Domain**: ${context.domain}` : null,
      context.conceptSummary ? `- **Concept summary**: ${context.conceptSummary}` : null,
      ``,
      `When answering questions, lean into this topic. Use it as a concrete example when relevant. `,
      `If the question is off-topic, answer it fully but gently connect back to the current concept if natural.`,
    ].filter(Boolean).join("\n");
    sections.push(contextSection);
  }

  if (context?.userNotes?.trim()) {
    const MAX_NOTES_LEN = 2000;
    const notes = context.userNotes.trim().slice(0, MAX_NOTES_LEN);
    const truncated = context.userNotes.trim().length > MAX_NOTES_LEN ? " *(truncated)*" : "";
    const notesSection = [
      `## Student's Personal Notes`,
      ``,
      `The student has taken the following personal notes on this topic. Use them to:`,
      `- Reference what they already know and build on it`,
      `- Identify any gaps, misconceptions, or areas that need deepening`,
      `- Affirm correct understanding and expand where appropriate`,
      `- Avoid re-explaining things they've clearly already grasped`,
      ``,
      `<student_notes>`,
      notes + truncated,
      `</student_notes>`,
    ].join("\n");
    sections.push(notesSection);
  }

  return sections.join("\n\n");
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorContext {
  conceptId?: string;
  conceptLabel?: string;
  conceptSummary?: string;
  domain?: string;
  locale?: string;
  userNotes?: string;
}

interface TutorRequest {
  messages: TutorMessage[];
  context?: TutorContext;
  /** Client-requested model. Only whitelisted values are accepted. */
  model?: string;
}

const ALLOWED_MODELS = new Set(["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"]);

function resolveModel(requested?: string): string {
  if (requested && ALLOWED_MODELS.has(requested)) return requested;
  return CHAT_MODEL;
}

/**
 * Resolve the model spec passed to `streamText`, preferring the AI Gateway,
 * then a direct OpenAI key. Returns `null` when no provider is configured, in
 * which case the caller falls back to the mock stream.
 *
 * The returned `model` is either:
 *   - a `"provider/model"` string (Gateway routes it automatically), or
 *   - an OpenAI model object from `createOpenAI(...)`.
 * Both are valid `model` arguments for the AI SDK's `streamText`.
 */
function resolveModelSpec(
  chosenModel: string,
): { model: unknown; label: string } | null {
  const gatewayKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (gatewayKey) {
    const id = chosenModel.includes("/") ? chosenModel : `${GATEWAY_PROVIDER}/${chosenModel}`;
    return { model: id, label: `gateway:${id}` };
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    const bare = chosenModel.includes("/") ? chosenModel.split("/").pop()! : chosenModel;
    return { model: openai(bare), label: `openai:${bare}` };
  }

  return null;
}

/** Stream a deterministic mock response word-by-word into the controller. */
async function pumpMock(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  messages: TutorMessage[],
  context?: TutorContext,
): Promise<void> {
  const mockText = buildMockResponse(messages, context);
  for (const word of mockText.split(/(?<=\s)/)) {
    await new Promise((r) => setTimeout(r, 14 + Math.random() * 20));
    controller.enqueue(encoder.encode(word));
  }
}

/* ─── Mock streaming (no API key) ───────────────────────────────────────── */

function buildMockResponse(messages: TutorMessage[], context?: TutorContext): string {
  const last = messages.findLast((m) => m.role === "user");
  const userText = last?.content?.toLowerCase() ?? "";
  const conceptLabel = context?.conceptLabel ?? context?.conceptId ?? "this concept";
  const isCs = context?.locale === "cs";

  if (isCs) {
    if (userText.includes("co je") || userText.includes("what is") || userText.includes("vysvětl")) {
      return `## ${conceptLabel}

**${conceptLabel}** je klíčový koncept v oblasti umělé inteligence.

### Intuice
Představ si to takto: místo abys ručně psal pravidla pro každou situaci, necháš model, aby se pravidla naučil sám z dat. Je to zásadní posun — od explicitního programování k učení se vzorů.

### Jak to funguje
1. **Data** → model vidí tisíce nebo miliony příkladů
2. **Učení** → postupně upravuje interní parametry tak, aby minimalizoval chybu
3. **Generalizace** → naučené vzory aplikuje na nová, neviděná data

### Příklad z praxe
\`\`\`python
# Jednoduchý příklad s PyTorch
import torch
import torch.nn as nn

model = nn.Linear(in_features=10, out_features=1)
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# Trénovací smyčka
for batch in dataloader:
    optimizer.zero_grad()
    output = model(batch.x)
    loss = nn.MSELoss()(output, batch.y)
    loss.backward()
    optimizer.step()
\`\`\`

### Proč na tom záleží
Bez tohoto přístupu by moderní AI neexistovala. Prakticky vše — od rozpoznávání obrazu po generování textu — stojí na tomto základě.

---
*Toto je ukázkový mock response. Pro plnohodnotné odpovědi nastav OPENAI_API_KEY v edge function secrets.*`;
    }

    return `Skvělá otázka týkající se **${conceptLabel}**!

Obecně řečeno, tento koncept je základní stavební kamení moderní AI. Zahrnuje několik klíčových aspektů:

- **Teoretický základ**: Matematická a statistická formalizace problému
- **Praktická implementace**: Konkrétní algoritmy a architekturní rozhodnutí  
- **Reálné využití**: Kde a jak se to používá v produkčních systémech

Pro hlubší pochopení doporučuji projít si sekce v AI Mapě a propojit tento koncept s příbuznými tématy.

---
*Mock odpověď — pro skutečné AI odpovědi nastav OPENAI_API_KEY.*`;
  }

  // English default
  if (userText.includes("what is") || userText.includes("explain") || userText.includes("how does")) {
    return `## ${conceptLabel}

**${conceptLabel}** is a foundational concept in modern AI.

### The Core Intuition
Instead of hand-crafting rules for every situation, you let the system learn patterns directly from data. This shift — from explicit programming to learned representations — is what makes modern AI possible.

### How It Works
1. **Data** → the model sees thousands or millions of labeled examples  
2. **Learning** → it iteratively adjusts internal parameters to minimize prediction error  
3. **Generalization** → learned patterns apply to new, unseen inputs  

### Practical Example
\`\`\`python
import torch
import torch.nn as nn

# A simple neural network layer
model = nn.Sequential(
    nn.Linear(768, 256),
    nn.ReLU(),
    nn.Linear(256, 10)
)

optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.01)

# Training loop
for batch in dataloader:
    logits = model(batch.embeddings)
    loss = nn.CrossEntropyLoss()(logits, batch.labels)
    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
\`\`\`

### Why It Matters
This is the bedrock of modern ML. Without it, there would be no image recognition at scale, no ChatGPT, no AlphaFold. Every state-of-the-art system builds on these foundations.

---
*This is a mock response. For real AI-powered answers, set \`OPENAI_API_KEY\` in your edge function secrets.*`;
  }

  return `Good question about **${conceptLabel}**!

Here's a focused answer:

The key insight is that modern AI systems learn representations from data rather than being explicitly programmed with rules. This applies directly to ${conceptLabel} in the following ways:

**Core mechanism**: The system optimizes a mathematical objective over a large dataset, discovering structure that humans might not have thought to hard-code.

**Practical implications**: 
- Enables generalization to new inputs not seen during training
- Scales with more data and compute (scaling laws)
- Can discover unexpected solutions that outperform hand-crafted approaches

**When this breaks down**: Distribution shift (training vs. deployment data mismatch), insufficient data, adversarial examples, and out-of-distribution inputs are the main failure modes to watch for.

---
*Mock response — for real AI answers, configure \`OPENAI_API_KEY\` in edge function secrets.*`;
}

/* ─── Main handler ──────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  let body: TutorRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const { messages = [], context, model: requestedModel } = body;
  const systemPrompt = buildSystemPrompt(context);
  const chosenModel = resolveModel(requestedModel);
  const spec = resolveModelSpec(chosenModel);
  const encoder = new TextEncoder();

  const streamHeaders = {
    ...getCorsHeaders(req),
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache",
  };

  /* ── No provider configured → mock stream ──────────────────────────── */
  if (!spec) {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        await pumpMock(controller, encoder, messages, context);
        controller.close();
      },
    });
    return new Response(stream, { headers: streamHeaders });
  }

  /* ── Real streaming (Gateway or direct OpenAI), mock on hard failure ─ */
  console.log(`[ai-tutor] streaming via ${spec.label}`);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedAny = false;
      try {
        const result = streamText({
          // deno-lint-ignore no-explicit-any
          model: spec.model as any,
          system: systemPrompt,
          messages,
          maxOutputTokens: MAX_TOKENS,
          temperature: 0.7,
        });

        for await (const chunk of result.textStream) {
          emittedAny = true;
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
        return;
      } catch (e) {
        console.error("[ai-tutor] stream error:", e);
        // Only degrade to mock if the model failed before producing any output;
        // a mid-stream failure has already shown partial content to the user.
        if (emittedAny) {
          controller.close();
          return;
        }
      }

      await pumpMock(controller, encoder, messages, context);
      controller.close();
    },
  });

  return new Response(stream, { headers: streamHeaders });
});

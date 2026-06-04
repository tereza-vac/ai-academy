/**
 * AI Tutor service — streaming chat with the `ai-tutor` edge function.
 *
 * Two implementations:
 *  - `mockTutorStream`   — simulated streaming for mock/dev mode (no backend)
 *  - `remoteTutorStream` — real streaming call to the `ai-tutor` edge function
 *
 * The edge function itself falls back to a high-quality mock response when
 * `OPENAI_API_KEY` is not set, so both modes produce useful output.
 */

import { API_CONFIG } from "@/config/api";
import { dataMode } from "@/lib/dataMode";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp */
  createdAt: string;
}

export interface TutorContext {
  /** AI Map concept id, e.g. "transformer" */
  conceptId?: string;
  /** Human-readable concept label */
  conceptLabel?: string;
  /** Short description/parable of the concept */
  conceptSummary?: string;
  /** Top-level domain, e.g. "LLMs" */
  domain?: string;
  /** Current locale, e.g. "cs" | "en" */
  locale?: string;
  /**
   * User's personal markdown notes for the current concept.
   * Injected into the AI system prompt as additional context,
   * enabling the AI to reference, expand, or correct the user's notes.
   */
  userNotes?: string;
}

export interface StreamOptions {
  messages: TutorMessage[];
  context?: TutorContext;
  /** AI model slug, e.g. "gpt-4o-mini" | "gpt-4o" */
  model?: string;
  /** Called for each text chunk as it streams in */
  onChunk: (chunk: string) => void;
  /** Called when the stream finishes normally */
  onDone: () => void;
  /** Called if the stream errors */
  onError: (err: Error) => void;
  /** AbortSignal to cancel the stream */
  signal?: AbortSignal;
}

/* ─── Mock streaming ────────────────────────────────────────────────────── */

const MOCK_RESPONSES_EN = [
  (concept: string) => `## Understanding ${concept}

${concept} is one of the most impactful ideas in modern AI — let me break it down clearly.

### The Core Intuition

Think of it this way: rather than encoding explicit rules, we let the system **learn patterns from data**. The model sees thousands of examples and gradually adjusts its internal parameters to capture the structure in that data.

This sounds simple, but it's remarkably powerful. Here's why: patterns in data can be extraordinarily complex — far beyond what any human could manually specify. By optimizing over massive datasets, models discover representations that generalize well to new inputs.

### A Concrete Example

\`\`\`python
import torch
import torch.nn as nn

class SimpleClassifier(nn.Module):
    def __init__(self, input_dim: int, num_classes: int):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.layers(x)

# Training
model = SimpleClassifier(input_dim=768, num_classes=10)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

for epoch in range(10):
    for batch in train_loader:
        logits = model(batch.features)
        loss = nn.CrossEntropyLoss()(logits, batch.labels)
        
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
\`\`\`

### Why It Matters

This paradigm underpins virtually everything in modern AI:
- **Computer vision**: CNNs learn to detect edges → textures → objects hierarchically
- **NLP**: Transformers learn contextual word representations
- **Reinforcement learning**: Agents learn to maximize reward through trial and error

The key insight: **representation matters**. The same raw data can be easy or impossible to learn from, depending on how it's represented. This is why feature engineering, architecture choice, and pretraining all matter so much.

### Common Pitfalls

1. **Overfitting**: The model memorizes training data instead of generalizing → use regularization, more data, or simpler models
2. **Distribution shift**: Training and deployment data differ → monitor production, use robust training
3. **Computational cost**: Learning complex patterns requires significant compute → choose architectures appropriate to your budget

---

*This is a demo response. Wire \`OPENAI_API_KEY\` for real AI-powered answers with full context.*`,
  (concept: string) => `## Deep Dive: ${concept}

Let me give you a practitioner's perspective on this.

### What Makes This Hard

The surprising thing about ${concept} isn't the idea — it's the engineering required to make it work reliably at scale. There are three core challenges:

**1. The optimization landscape**

The loss functions we optimize are non-convex with millions or billions of parameters. We can't find the global minimum analytically — we use stochastic gradient descent and its variants, which are embarrassingly simple algorithms that somehow work remarkably well in practice.

**2. The data problem**

"Garbage in, garbage out" is more true in ML than anywhere else. Quality of training data — its diversity, labeling accuracy, and coverage of edge cases — often matters more than model architecture.

**3. Evaluation**

Knowing when your model is actually good is non-trivial. Standard metrics (accuracy, F1) often don't capture what you care about in production. This is why evaluation methodology is its own deep field.

### The Practitioner's Toolkit

\`\`\`python
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report
import numpy as np

def robust_evaluation(model, X, y, n_splits=5):
    """Cross-validated evaluation with confidence intervals."""
    kf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    scores = []
    
    for fold, (train_idx, val_idx) in enumerate(kf.split(X, y)):
        X_train, X_val = X[train_idx], X[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_val)
        
        report = classification_report(y_val, y_pred, output_dict=True)
        scores.append(report['weighted avg']['f1-score'])
    
    return {
        'mean': np.mean(scores),
        'std': np.std(scores),
        'ci_95': (np.mean(scores) - 1.96 * np.std(scores),
                  np.mean(scores) + 1.96 * np.std(scores))
    }
\`\`\`

### Key Takeaway

The best practitioners spend more time on **problem formulation and data** than on model architecture. The model is almost the last thing you should optimize. Get the fundamentals right first.

---
*Demo response — configure the backend for live AI answers.*`,
];

const MOCK_RESPONSES_CS = [
  (concept: string) => `## Porozumění pojmu: ${concept}

Pojďme si to rozebrat pořádně — od intuice po praktické dopady.

### Základní intuice

Místo ručního kódování pravidel necháváme systém **učit se vzory z dat**. Model vidí tisíce příkladů a postupně upravuje své interní parametry tak, aby zachytil strukturu v těchto datech.

To zní jednoduše, ale je to neobyčejně mocné. Proč? Protože vzory v datech mohou být mimořádně složité — daleko za hranicemi toho, co by jakýkoliv člověk dokázal ručně specifikovat.

### Konkrétní příklad

\`\`\`python
import torch
import torch.nn as nn

class JednoduchyKlasifikator(nn.Module):
    def __init__(self, vstupni_dim: int, pocet_trid: int):
        super().__init__()
        self.vrstvy = nn.Sequential(
            nn.Linear(vstupni_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, pocet_trid)
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.vrstvy(x)

# Trénování
model = JednoduchyKlasifikator(vstupni_dim=768, pocet_trid=5)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

for epoch in range(10):
    for batch in trenovaci_loader:
        logity = model(batch.features)
        loss = nn.CrossEntropyLoss()(logity, batch.labels)
        
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
\`\`\`

### Proč na tom záleží

Tento přístup stojí za prakticky vším v moderní AI:
- **Počítačové vidění**: CNN se učí hierarchicky — hrany → textury → objekty
- **Zpracování textu**: Transformery se učí kontextuální reprezentace slov
- **Reinforcement learning**: Agenti se učí maximalizovat odměnu pokusem a omylem

### Časté chyby

1. **Přetrénování**: Model si zapamatuje trénovací data místo generalizace → regularizace, více dat
2. **Distribuční posun**: Trénovací a produkční data se liší → monitorování, robustní trénování
3. **Výpočetní náklady**: Komplexní vzory vyžadují výrazný compute

---
*Demo odpověď. Pro skutečné AI odpovědi nastav \`OPENAI_API_KEY\` v edge function secrets.*`,
];

async function mockStream(options: StreamOptions): Promise<void> {
  const { messages, context, onChunk, onDone, signal } = options;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content?.toLowerCase() ?? "";
  const conceptLabel = context?.conceptLabel ?? context?.conceptId ?? "this concept";
  const isCs = context?.locale === "cs";

  let text: string;
  if (isCs) {
    const pick = MOCK_RESPONSES_CS[Math.floor(Math.random() * MOCK_RESPONSES_CS.length)];
    text = pick(conceptLabel);
  } else {
    const pick = MOCK_RESPONSES_EN[Math.floor(Math.random() * MOCK_RESPONSES_EN.length)];
    text = pick(conceptLabel);
  }

  // If query contains specific keywords, adjust slightly
  if (query.includes("code") || query.includes("example") || query.includes("příklad")) {
    text = text; // already has code blocks
  }

  // Simulate word-by-word streaming
  const tokens = text.split(/(?<=\s)|(?=\n)/);
  for (const token of tokens) {
    if (signal?.aborted) return;
    await new Promise<void>((r) => setTimeout(r, 20 + Math.random() * 30));
    try {
      onChunk(token);
    } catch {
      return;
    }
  }

  onDone();
}

/* ─── Remote streaming ──────────────────────────────────────────────────── */

async function remoteStream(options: StreamOptions): Promise<void> {
  const { messages, context, model, onChunk, onDone, onError, signal } = options;

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? API_CONFIG.SUPABASE_PUBLISHABLE_KEY;

  const wireMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  let res: Response;
  try {
    res = await fetch(API_CONFIG.AI_TUTOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ messages: wireMessages, context, model }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onError(new Error(`Network error: ${(e as Error).message}`));
    return;
  }

  if (!res.ok) {
    onError(new Error(`Tutor API error: ${res.status} ${res.statusText}`));
    return;
  }

  if (!res.body) {
    onError(new Error("No response body"));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) {
        reader.cancel();
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
    onDone();
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      onError(e as Error);
    }
  } finally {
    reader.releaseLock();
  }
}

/* ─── Public API ────────────────────────────────────────────────────────── */

/**
 * Stream a tutor response. In mock mode, simulates streaming locally.
 * In supabase mode, calls the `ai-tutor` edge function (which itself falls
 * back to mock responses if `OPENAI_API_KEY` is not set in secrets).
 */
export function streamTutorResponse(options: StreamOptions): void {
  if (dataMode === "supabase") {
    remoteStream(options).catch(options.onError);
  } else {
    mockStream(options).catch(options.onError);
  }
}

/* ─── Available models ──────────────────────────────────────────────────── */

export const TUTOR_MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast · Good for most questions" },
  { id: "gpt-4o",      label: "GPT-4o",      description: "Smart · Best for complex topics" },
] as const;

export type TutorModelId = typeof TUTOR_MODELS[number]["id"];

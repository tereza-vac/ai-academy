/**
 * StudyPlanModal — form + streaming AI generation of a personalized study plan.
 *
 * User fills in: goal, background level, days per week, number of weeks.
 * Sends a structured prompt to the AI Tutor API and streams back the plan.
 * On completion, parses the markdown into checklist items and saves to localStorage.
 */
import { useCallback, useRef, useState } from "react";
import { ArrowRight, Brain, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { streamTutorResponse } from "@/services/tutorApi";
import { savePlan, extractItems, type StudyPlan } from "@/services/studyPlan";
import { ALL_NODES, pickLocaleText } from "@/lib/aiMapData";

interface Props {
  onClose: () => void;
  onCreated: (plan: StudyPlan) => void;
  locale?: "cs" | "en";
}

const BACKGROUND_LEVELS = [
  { id: "beginner",     label: { cs: "Začátečník — Python základy",          en: "Beginner — basic Python"              } },
  { id: "intermediate", label: { cs: "Středně pokročilý — znám ML základy",  en: "Intermediate — familiar with ML basics" } },
  { id: "advanced",     label: { cs: "Pokročilý — pracuji s modely",          en: "Advanced — I work with models regularly" } },
] as const;

type Background = typeof BACKGROUND_LEVELS[number]["id"];

const GOAL_SUGGESTIONS = {
  en: [
    "Understand how large language models work from scratch",
    "Learn to build RAG pipelines and AI agents",
    "Deep-dive into transformers and attention mechanisms",
    "Master reinforcement learning fundamentals",
    "Learn computer vision with neural networks",
  ],
  cs: [
    "Pochopit jak fungují velké jazykové modely od základu",
    "Naučit se budovat RAG pipeline a AI agenty",
    "Prohloubit znalosti transformerů a attention mechanismů",
    "Zvládnout základy zpevňovacího učení",
    "Naučit se počítačové vidění s neuronovými sítěmi",
  ],
};

function buildPrompt(
  goal: string,
  background: Background,
  daysPerWeek: number,
  weeks: number,
  locale: string,
  conceptList: string,
): string {
  const lang = locale === "cs" ? "Czech" : "English";
  const bgLabels: Record<Background, string> = {
    beginner:     "beginner (knows basic Python)",
    intermediate: "intermediate (familiar with ML fundamentals)",
    advanced:     "advanced (works with models regularly)",
  };

  return `You are an expert AI learning coach. Create a personalized, structured study plan.

**Student goal**: ${goal}
**Background**: ${bgLabels[background]}
**Schedule**: ${daysPerWeek} days/week for ${weeks} week(s)
**Language**: Write the plan in ${lang}

**Available concepts in our AI Map** (use these exact labels when referencing topics):
${conceptList}

**Requirements**:
- Organize by week, then by day within each week
- Each day: 1-3 concepts with a specific guiding question to explore with the AI Tutor
- Estimate study time per day (20–60 min)
- Start from the student's background level — don't repeat what they already know
- End each week with a consolidation activity (review, quiz, or project idea)
- Use markdown: ## Week N headers, ### Day N sub-headers, bullet points for tasks
- Make it concrete and actionable, not generic

Write the full plan now:`;
}

export function StudyPlanModal({ onClose, onCreated, locale = "en" }: Props) {
  const [goal, setGoal] = useState("");
  const [background, setBackground] = useState<Background>("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [weeks, setWeeks] = useState(2);
  const [streaming, setStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Build concept label list for the prompt
  const conceptList = ALL_NODES
    .filter((n) => n.parentId !== null && n.parentId !== "ai-root")
    .slice(0, 80) // keep prompt reasonable
    .map((n) => `- ${pickLocaleText(n.label, locale)}`)
    .join("\n");

  // Label map for extractItems
  const labelMap = new Map(
    ALL_NODES.map((n) => [n.id, pickLocaleText(n.label, locale)]),
  );

  const handleGenerate = useCallback(async () => {
    if (!goal.trim() || streaming) return;
    setStreaming(true);
    setStreamedContent("");

    const abort = new AbortController();
    abortRef.current = abort;

    const prompt = buildPrompt(goal.trim(), background, daysPerWeek, weeks, locale, conceptList);
    let fullContent = "";

    streamTutorResponse({
      messages: [{ id: "plan-req", role: "user", content: prompt, createdAt: new Date().toISOString() }],
      model: "gpt-4o-mini",
      signal: abort.signal,
      onChunk(chunk) {
        fullContent += chunk;
        setStreamedContent(fullContent);
      },
      onDone() {
        setStreaming(false);
        const plan: StudyPlan = {
          id: `plan-${Date.now()}`,
          goal: goal.trim(),
          background,
          daysPerWeek,
          weeksTotal: weeks,
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          content: fullContent,
          items: extractItems(fullContent, labelMap),
        };
        savePlan(plan);
        onCreated(plan);
        onClose();
      },
      onError() {
        setStreaming(false);
      },
    });
  }, [goal, background, daysPerWeek, weeks, locale, conceptList, labelMap, streaming, onCreated, onClose]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamedContent("");
  };

  const suggestions = GOAL_SUGGESTIONS[locale] ?? GOAL_SUGGESTIONS.en;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.currentTarget === e.target && !streaming) onClose(); }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border-subtle bg-surface-elevated shadow-elevation-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-body-md font-semibold text-content-primary">
              {locale === "cs" ? "Vytvořit studijní plán" : "Create study plan"}
            </h2>
          </div>
          {!streaming && (
            <button type="button" onClick={onClose}
              className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Form / Streaming content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!streaming ? (
            <>
              {/* Goal */}
              <div className="space-y-2">
                <label className="block text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {locale === "cs" ? "Tvůj cíl" : "Your learning goal"}
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={locale === "cs" ? "Např. chci pochopit jak fungují LLMs…" : "e.g. I want to understand how LLMs work…"}
                  rows={3}
                  className={cn(
                    "w-full resize-none rounded-xl border border-border-subtle bg-surface-base px-3 py-2.5",
                    "text-body-sm text-content-primary placeholder:text-content-tertiary outline-none",
                    "focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] transition-shadow",
                  )}
                />
                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 3).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setGoal(s)}
                      className="rounded-full border border-border-subtle bg-surface-base px-2.5 py-1 text-caption-xs text-content-secondary hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      {s.length > 40 ? s.slice(0, 40) + "…" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background */}
              <div className="space-y-2">
                <label className="block text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {locale === "cs" ? "Tvůj background" : "Your background"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BACKGROUND_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setBackground(lvl.id)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-caption-xs text-left transition-all",
                        background === lvl.id
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border-subtle bg-surface-base text-content-secondary hover:border-border-strong",
                      )}
                    >
                      {lvl.label[locale]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">
                    {locale === "cs" ? "Dní za týden" : "Days per week"}
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDaysPerWeek(d)}
                        className={cn(
                          "flex-1 rounded-lg border py-2 text-caption-xs font-semibold transition-all",
                          daysPerWeek === d
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border-subtle bg-surface-base text-content-tertiary hover:text-content-primary",
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">
                    {locale === "cs" ? "Počet týdnů" : "Weeks"}
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeeks(w)}
                        className={cn(
                          "flex-1 rounded-lg border py-2 text-caption-xs font-semibold transition-all",
                          weeks === w
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border-subtle bg-surface-base text-content-tertiary hover:text-content-primary",
                        )}
                      >
                        {w}w
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border-subtle bg-surface-base px-4 py-3 text-caption-xs text-content-tertiary/80">
                {daysPerWeek * weeks} total study sessions ·{" "}
                {locale === "cs"
                  ? `plán na ${weeks} ${weeks === 1 ? "týden" : "týdny"} s ${daysPerWeek} dny za týden`
                  : `${weeks}-week plan with ${daysPerWeek} day${daysPerWeek !== 1 ? "s" : ""}/week`}
              </div>
            </>
          ) : (
            /* Streaming preview */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-body-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {locale === "cs" ? "Vytvářím tvůj plán…" : "Generating your plan…"}
              </div>
              <div className="font-mono text-caption-xs text-content-secondary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-border-subtle rounded-xl p-3 bg-surface-base">
                {streamedContent}
                <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle px-5 py-3 flex items-center justify-end gap-2 shrink-0">
          {streaming ? (
            <Button variant="outline" size="sm" onClick={handleCancel}>
              {locale === "cs" ? "Zrušit" : "Cancel"}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {locale === "cs" ? "Zavřít" : "Close"}
              </Button>
              <Button size="sm" onClick={handleGenerate} disabled={!goal.trim()}>
                <Brain className="h-3.5 w-3.5" />
                {locale === "cs" ? "Vygenerovat plán" : "Generate plan"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

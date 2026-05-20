import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { defaultEnrichment } from "@/services/aiEnrichmentService";
import type { Topic } from "@/types/domain";

interface GeneratedQuestion {
  id: string;
  kind: "mcq" | "flashcard";
  prompt: string;
  options?: string[];
  answerIndex?: number;
  answer?: string;
  explanation?: string;
}

interface Props {
  topic: Topic;
}

/**
 * "Generate practice questions" — the visible touchpoint for the real LLM
 * integration. Hits `defaultEnrichment.generateQuiz`, which routes to either
 * the local mock or the `ai-enrich` edge function depending on data mode.
 */
export function AIGeneratedQuestions({ topic }: Props) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  const generate = useMutation({
    mutationFn: async () => {
      const result = await defaultEnrichment.generateQuiz({
        topicTitle: topic.title,
        topicBody: [topic.summary, topic.bodyMd].filter(Boolean).join("\n\n"),
        count: 4,
      });
      return result.questions;
    },
    onSuccess: (data) => {
      setQuestions(data);
      toast.success(`Generated ${data.length} question${data.length === 1 ? "" : "s"}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  return (
    <Card variant="soft">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-body-md">Practice with AI</CardTitle>
            <p className="text-body-sm text-content-secondary">
              Generate fresh questions from this topic on demand.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {questions.length > 0 ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      {questions.length > 0 ? (
        <CardContent className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-xl border border-border-subtle bg-surface-elevated p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="muted">{q.kind === "mcq" ? "MCQ" : "Flashcard"}</Badge>
                <span className="text-caption-xs text-content-tertiary">
                  Question {idx + 1}
                </span>
              </div>
              <div className="text-body-md font-medium text-content-primary">
                {q.prompt}
              </div>
              {q.kind === "mcq" && q.options ? (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-content-secondary marker:text-content-tertiary">
                  {q.options.map((opt, i) => (
                    <li
                      key={i}
                      className={
                        i === q.answerIndex
                          ? "font-medium text-[hsl(var(--success))]"
                          : undefined
                      }
                    >
                      {opt}
                    </li>
                  ))}
                </ol>
              ) : null}
              {q.kind === "flashcard" && q.answer ? (
                <div className="mt-2 rounded-lg bg-surface-soft p-2 text-body-sm text-content-primary">
                  <span className="font-medium text-content-secondary">Answer: </span>
                  {q.answer}
                </div>
              ) : null}
              {q.explanation ? (
                <p className="mt-2 text-body-sm text-content-tertiary">
                  {q.explanation}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

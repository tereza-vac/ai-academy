import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getQuizBySlug, recordQuizAttempt } from "@/services/practiceApi";
import { queryKeys } from "@/lib/queryKeys";
import { useQuizRunnerStore, selectScore } from "@/stores/quizRunnerStore";

export function Component() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const quizQuery = useQuery({
    queryKey: queryKeys.quizBySlug(slug),
    queryFn: () => getQuizBySlug(slug),
    enabled: Boolean(slug),
  });

  const start = useQuizRunnerStore((s) => s.start);
  const reset = useQuizRunnerStore((s) => s.reset);
  const quiz = useQuizRunnerStore((s) => s.quiz);
  const currentIndex = useQuizRunnerStore((s) => s.currentIndex);
  const answers = useQuizRunnerStore((s) => s.answers);
  const completed = useQuizRunnerStore((s) => s.completed);
  const next = useQuizRunnerStore((s) => s.next);
  const prev = useQuizRunnerStore((s) => s.prev);
  const answerMCQ = useQuizRunnerStore((s) => s.answerMCQ);
  const revealFlashcard = useQuizRunnerStore((s) => s.revealFlashcard);
  const score = useQuizRunnerStore(selectScore);

  useEffect(() => {
    if (quizQuery.data && quiz?.id !== quizQuery.data.id) {
      start(quizQuery.data);
    }
  }, [quizQuery.data, quiz?.id, start]);

  useEffect(() => {
    if (!completed || !quizQuery.data) return;
    recordQuizAttempt({
      quizId: quizQuery.data.id,
      answers: Object.values(answers).map((a) => ({
        questionId: a.questionId,
        answerIndex: a.answerIndex,
        answer: a.answer,
        correct: a.correct,
      })),
      score: score.score,
      total: score.total,
    }).catch(() => {
      // Best-effort: in mock mode this is a no-op anyway.
    });
  }, [completed, quizQuery.data, answers, score]);

  if (quizQuery.isLoading || !quiz) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }
  if (!quizQuery.data) {
    return (
      <EmptyState
        title="Quiz not found"
        description="It might be unpublished or removed."
        action={<Button onClick={() => navigate("/practice")}>Back to Practice</Button>}
      />
    );
  }

  const question = quiz.questions[currentIndex];
  const total = quiz.questions.length;
  const answer = question ? answers[question.id] : undefined;
  const progress = Math.round(((currentIndex + (answer?.revealed ? 1 : 0)) / total) * 100);

  if (completed) {
    const passed = score.total > 0 && score.score / score.total >= 0.6;
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/practice">
            <ArrowLeft className="h-4 w-4" /> Back to Practice
          </Link>
        </Button>
        <Card variant="elevated" className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-primary">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-heading-md font-semibold tracking-tight text-content-primary">
            {passed ? "Nice work" : "Good attempt"}
          </h2>
          <p className="mt-1 text-body-md text-content-secondary">
            You scored {score.score} out of {score.total}.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                start(quizQuery.data!);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <Button asChild>
              <Link to="/practice">Back to Practice</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/practice">
          <ArrowLeft className="h-4 w-4" /> Back to Practice
        </Link>
      </Button>

      <PageHeader
        eyebrow={`Question ${currentIndex + 1} of ${total}`}
        title={quiz.title}
        description={quiz.description ?? undefined}
        actions={<Badge variant="muted">{quiz.difficulty}</Badge>}
      />

      <Progress value={progress} />

      {question?.kind === "mcq" ? (
        <McqCard
          question={question}
          revealed={Boolean(answer?.revealed)}
          chosenIndex={answer?.answerIndex}
          onChoose={(idx) =>
            answerMCQ(question.id, idx, idx === question.answerIndex)
          }
        />
      ) : question ? (
        <FlashcardCard
          question={question}
          revealed={Boolean(answer?.revealed)}
          markedCorrect={answer?.correct}
          onReveal={() => revealFlashcard(question.id, true)}
          onSelfRate={(correct) => revealFlashcard(question.id, correct)}
        />
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={prev} disabled={currentIndex === 0}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <Button onClick={next} disabled={!answer?.revealed}>
          {currentIndex === total - 1 ? "Finish" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function McqCard({
  question,
  revealed,
  chosenIndex,
  onChoose,
}: {
  question: Extract<NonNullable<ReturnType<typeof useQuizRunnerStore.getState>["quiz"]>["questions"][number], { kind: "mcq" }>;
  revealed: boolean;
  chosenIndex: number | undefined;
  onChoose: (idx: number) => void;
}) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-heading-sm">{question.prompt}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {question.options.map((opt, idx) => {
          const isChosen = chosenIndex === idx;
          const isCorrect = idx === question.answerIndex;
          const state = !revealed
            ? "idle"
            : isCorrect
              ? "correct"
              : isChosen
                ? "wrong"
                : "muted";
          return (
            <button
              key={idx}
              type="button"
              onClick={() => !revealed && onChoose(idx)}
              disabled={revealed}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-body-md transition-colors outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                state === "idle" && "border-border-subtle bg-surface-base hover:border-border-strong",
                state === "correct" && "border-[hsl(var(--success))] bg-success-soft text-content-primary",
                state === "wrong" && "border-[hsl(var(--coral))] bg-coral-soft text-content-primary",
                state === "muted" && "border-border-subtle bg-surface-base opacity-60",
              )}
            >
              <span>{opt}</span>
              {state === "correct" ? <Check className="h-4 w-4 text-[hsl(var(--success))]" /> : null}
              {state === "wrong" ? <X className="h-4 w-4 text-[hsl(var(--coral))]" /> : null}
            </button>
          );
        })}
        {revealed && question.explanation ? (
          <p className="rounded-lg bg-surface-soft p-3 text-body-sm text-content-secondary">
            {question.explanation}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FlashcardCard({
  question,
  revealed,
  markedCorrect,
  onReveal,
  onSelfRate,
}: {
  question: Extract<NonNullable<ReturnType<typeof useQuizRunnerStore.getState>["quiz"]>["questions"][number], { kind: "flashcard" }>;
  revealed: boolean;
  markedCorrect: boolean | undefined;
  onReveal: () => void;
  onSelfRate: (correct: boolean) => void;
}) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-heading-sm">{question.prompt}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!revealed ? (
          <Button onClick={onReveal}>Show answer</Button>
        ) : (
          <>
            <div className="rounded-xl border border-border-subtle bg-surface-soft p-4 text-body-md text-content-primary">
              {question.answer}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm text-content-secondary">How did you do?</span>
              <Button
                size="sm"
                variant={markedCorrect === false ? "destructive" : "outline"}
                onClick={() => onSelfRate(false)}
              >
                <X className="h-3.5 w-3.5" />
                Missed it
              </Button>
              <Button
                size="sm"
                variant={markedCorrect === true ? "default" : "outline"}
                onClick={() => onSelfRate(true)}
              >
                <Check className="h-3.5 w-3.5" />
                Got it
              </Button>
            </div>
            {question.explanation ? (
              <p className="text-body-sm text-content-tertiary">{question.explanation}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default Component;

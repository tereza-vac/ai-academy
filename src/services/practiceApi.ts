import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { localizeQuiz } from "@/lib/contentLocalization";
import { mockQuizzes } from "@/lib/mockData";
import type { Difficulty, Question, Quiz } from "@/types/domain";

interface QuizRow {
  id: string;
  slug: string;
  title: string;
  title_key: string | null;
  description: string | null;
  description_key: string | null;
  topic_id: string | null;
  difficulty: Difficulty;
  questions: Question[];
  estimated_minutes: number;
}

function mapQuiz(row: QuizRow): Quiz {
  return {
    id: row.id, slug: row.slug, title: row.title,
    titleKey: row.title_key,
    description: row.description, topicId: row.topic_id,
    descriptionKey: row.description_key,
    difficulty: row.difficulty,
    questions: Array.isArray(row.questions) ? row.questions : [],
    estimatedMinutes: row.estimated_minutes,
  };
}

const SELECT = "id,slug,title,title_key,description,description_key,topic_id,difficulty,questions,estimated_minutes";

export async function listQuizzes(): Promise<Quiz[]> {
  if (isMock) return [...mockQuizzes].map(localizeQuiz);

  const { data, error } = await supabase
    .from("quizzes")
    .select(SELECT)
    .eq("is_published", true)
    .order("title");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapQuiz(row as unknown as QuizRow)).map(localizeQuiz);
}

export async function getQuizBySlug(slug: string): Promise<Quiz | null> {
  if (isMock) {
    const quiz = mockQuizzes.find((q) => q.slug === slug);
    return quiz ? localizeQuiz(quiz) : null;
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? localizeQuiz(mapQuiz(data as unknown as QuizRow)) : null;
}

export async function recordQuizAttempt(input: {
  quizId: string;
  answers: Array<{ questionId: string; answerIndex?: number; answer?: string; correct: boolean }>;
  score: number;
  total: number;
}): Promise<void> {
  if (isMock) {
    // No-op in mock mode; the runner keeps state in Zustand.
    return;
  }
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You must be signed in to record quiz attempts.");

  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: userId,
    quiz_id: input.quizId,
    answers: input.answers,
    score: input.score,
    total: input.total,
    completed_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

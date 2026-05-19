import { create } from "zustand";
import type { Quiz } from "@/types/domain";

interface AnswerRecord {
  questionId: string;
  answerIndex?: number;
  answer?: string;
  correct: boolean;
  revealed: boolean;
}

interface QuizRunnerState {
  quiz: Quiz | null;
  currentIndex: number;
  answers: Record<string, AnswerRecord>;
  completed: boolean;

  start: (quiz: Quiz) => void;
  reset: () => void;
  next: () => void;
  prev: () => void;
  answerMCQ: (questionId: string, answerIndex: number, correct: boolean) => void;
  revealFlashcard: (questionId: string, correct: boolean) => void;
  complete: () => void;
}

export const useQuizRunnerStore = create<QuizRunnerState>((set, get) => ({
  quiz: null,
  currentIndex: 0,
  answers: {},
  completed: false,

  start: (quiz) =>
    set({ quiz, currentIndex: 0, answers: {}, completed: false }),

  reset: () => set({ quiz: null, currentIndex: 0, answers: {}, completed: false }),

  next: () => {
    const { quiz, currentIndex } = get();
    if (!quiz) return;
    const last = quiz.questions.length - 1;
    if (currentIndex < last) set({ currentIndex: currentIndex + 1 });
    else set({ completed: true });
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  answerMCQ: (questionId, answerIndex, correct) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { questionId, answerIndex, correct, revealed: true },
      },
    })),

  revealFlashcard: (questionId, correct) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { questionId, correct, revealed: true },
      },
    })),

  complete: () => set({ completed: true }),
}));

export const selectScore = (s: QuizRunnerState) => {
  const total = s.quiz?.questions.length ?? 0;
  const score = Object.values(s.answers).filter((a) => a.correct).length;
  return { score, total };
};

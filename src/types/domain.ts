/**
 * Shared domain types. Mirror the Supabase schema and stay stable between
 * mock data and real data.
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type ResourceKind =
  | "article"
  | "paper"
  | "video"
  | "podcast"
  | "tool"
  | "release"
  | "tweet"
  | "other";

export type BuildLabKind = "prompt" | "playbook" | "template" | "checklist";

export type QuestionKind = "mcq" | "flashcard";

export interface Track {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  color: string | null;
  position: number;
}

export interface Topic {
  id: string;
  trackId: string | null;
  slug: string;
  title: string;
  summary: string | null;
  bodyMd: string | null;
  difficulty: Difficulty;
  estimatedMinutes: number;
  prerequisites: string[];
  tags: string[];
  position: number;
}

export interface Resource {
  id: string;
  url: string;
  title: string;
  sourceName: string | null;
  kind: ResourceKind;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  tags: string[];
  topicIds: string[];
  enrichmentStatus: "pending" | "enriched" | "failed" | "manual";
}

export interface SavedItem {
  id: string;
  userId: string;
  resourceId: string;
  note: string | null;
  tags: string[];
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  topicId: string | null;
  resourceId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionMCQ {
  id: string;
  kind: "mcq";
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface QuestionFlashcard {
  id: string;
  kind: "flashcard";
  prompt: string;
  answer: string;
  explanation?: string;
}

export type Question = QuestionMCQ | QuestionFlashcard;

export interface Quiz {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  topicId: string | null;
  difficulty: Difficulty;
  questions: Question[];
  estimatedMinutes: number;
}

export interface BuildLabItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  kind: BuildLabKind;
  bodyMd: string;
  tags: string[];
  topicIds: string[];
  author: string | null;
  position: number;
}

export interface RadarItem {
  id: string;
  link: string;
  title: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  sourceName: string | null;
  sourceCategory: string | null;
}

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

export type ResourceAvailability =
  | "metadata_only"
  | "excerpt_only"
  | "full_text_api"
  | "full_text_scraped"
  | "full_text_unavailable";

export type BuildLabKind = "prompt" | "playbook" | "template" | "checklist";

export type QuestionKind = "mcq" | "flashcard";

export interface Track {
  id: string;
  slug: string;
  title: string;
  titleKey?: string | null;
  description: string | null;
  descriptionKey?: string | null;
  color: string | null;
  position: number;
}

export interface Topic {
  id: string;
  trackId: string | null;
  slug: string;
  title: string;
  titleKey?: string | null;
  summary: string | null;
  summaryKey?: string | null;
  bodyMd: string | null;
  bodyKey?: string | null;
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
  titleKey?: string | null;
  sourceName: string | null;
  kind: ResourceKind;
  summary: string | null;
  summaryKey?: string | null;
  author: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  tags: string[];
  topicIds: string[];
  enrichmentStatus: "pending" | "enriched" | "failed" | "manual";
  externalId?: string | null;
  isCanonical?: boolean;
  canonicalCategory?: string | null;
  canonicalPosition?: number | null;
  /**
   * How much of this resource is available to render inside AI Academy.
   * Set by the resource-import edge function. Drives whether the
   * "Read in AI Academy" button appears on cards.
   */
  availability: ResourceAvailability;
  /** ISO 639-1 of the imported source content, or null if not yet imported. */
  sourceLang: string | null;
}

export type CanonicalCategory =
  | "foundations"
  | "models"
  | "alignment"
  | "prompting"
  | "agents"
  | "rag"
  | "scaling"
  | "multimodal"
  | "reasoning";

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
  promptKey?: string;
  options: string[];
  optionKeys?: string[];
  answerIndex: number;
  explanation?: string;
  explanationKey?: string;
}

export interface QuestionFlashcard {
  id: string;
  kind: "flashcard";
  prompt: string;
  promptKey?: string;
  answer: string;
  answerKey?: string;
  explanation?: string;
  explanationKey?: string;
}

export type Question = QuestionMCQ | QuestionFlashcard;

export interface Quiz {
  id: string;
  slug: string;
  title: string;
  titleKey?: string | null;
  description: string | null;
  descriptionKey?: string | null;
  topicId: string | null;
  difficulty: Difficulty;
  questions: Question[];
  estimatedMinutes: number;
}

export interface BuildLabItem {
  id: string;
  slug: string;
  title: string;
  titleKey?: string | null;
  summary: string | null;
  summaryKey?: string | null;
  kind: BuildLabKind;
  bodyMd: string;
  bodyKey?: string | null;
  tags: string[];
  topicIds: string[];
  author: string | null;
  position: number;
}

export type RadarSourceType = "rss" | "arxiv" | "hf_daily_papers";

export type RadarKind =
  | "article"
  | "paper"
  | "release"
  | "video"
  | "podcast"
  | "tool"
  | "tweet"
  | "community"
  | "other";

export interface RadarItem {
  id: string;
  link: string;
  title: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  sourceName: string | null;
  sourceCategory: string | null;
  sourceType: RadarSourceType | null;
  kind: RadarKind | null;
  tags: string[];
  hfUpvotes: number | null;
  externalId: string | null;
  score: number | null;
  resourceId: string | null;
}

/**
 * Result row returned by the `papers-search` Edge Function. Mirrors the
 * server-side `PaperHit` shape.
 */
export interface PaperHit {
  externalId: string;
  doi: string | null;
  arxivId: string | null;
  source: "semanticScholar" | "openalex" | "arxiv";
  url: string;
  title: string;
  abstract: string | null;
  authors: string[];
  year: number | null;
  venue: string | null;
  citationCount: number | null;
  pdfUrl: string | null;
}

/**
 * Common metadata used by `upsertExternalResource` to mint a `resources` row
 * from any external item (radar pick, Scholar hit, manual entry).
 */
export interface ExternalResourceInput {
  url: string;
  title: string;
  summary?: string | null;
  sourceName?: string | null;
  kind?: ResourceKind;
  author?: string | null;
  publishedAt?: string | null;
  tags?: string[];
  externalId?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Basecamp integration                                                        */
/* -------------------------------------------------------------------------- */

export type BasecampManualVisibility = "show" | "hide" | null;

export type BasecampRecordingKind =
  | "message"
  | "comment"
  | "todo"
  | "todolist"
  | "schedule_entry"
  | "document"
  | "question_answer"
  | "cloud_file"
  | "upload"
  | "vault"
  | string;

export interface BasecampProject {
  id: string;
  basecampId: number;
  name: string;
  description: string | null;
  purpose: string | null;
  status: string | null;
  url: string;
  appUrl: string | null;
  isAiRelevant: boolean;
  manualVisibility: BasecampManualVisibility;
  lastActiveAt: string | null;
  ingestedAt: string;
}

export interface BasecampRecording {
  id: string;
  projectId: string;
  kind: BasecampRecordingKind;
  title: string | null;
  excerpt: string | null;
  contentHtml: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  url: string | null;
  postedAt: string | null;
  editedAt: string | null;
}

/** Project + last-N recordings, the shape used by the Team page tiles. */
export interface BasecampProjectWithActivity extends BasecampProject {
  recentActivity: BasecampRecording[];
}

/* -------------------------------------------------------------------------- */
/* LLM model catalog ("Spektrum modelů")                                       */
/* -------------------------------------------------------------------------- */

export type LlmLicenseType = "commercial" | "open_source" | "research" | "unknown";
export type LlmPopularityTier = "mainstream" | "emerging" | "niche" | "legacy";
export type LlmModelSource = "curated" | "openrouter" | "huggingface";

export interface LlmModel {
  id: string;
  slug: string;
  name: string;
  provider: string;
  family: string | null;
  licenseType: LlmLicenseType;
  modalities: string[];
  contextWindow: number | null;
  parameterCount: string | null;
  releaseDate: string | null;
  summary: string | null;
  descriptionMd: string | null;
  typicalUseCases: string[];
  strengths: string[];
  limitations: string[];
  tags: string[];
  homepageUrl: string | null;
  docsUrl: string | null;
  pricingHint: string | null;
  isNiche: boolean;
  popularityTier: LlmPopularityTier;
  externalId: string | null;
  source: LlmModelSource;
  score: number;
  fetchedAt: string;
}

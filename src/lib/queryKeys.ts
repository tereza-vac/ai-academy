import type { PapersSearchInput } from "@/services/papersSearchApi";

/** Centralised TanStack Query keys so cache invalidation stays consistent. */
export const queryKeys = {
  tracks: ["tracks"] as const,
  topics: ["topics"] as const,
  topicBySlug: (slug: string) => ["topics", "by-slug", slug] as const,

  resources: (opts?: { topicId?: string }) =>
    opts?.topicId ? (["resources", { topicId: opts.topicId }] as const) : (["resources"] as const),
  canonicalResources: ["resources", "canonical"] as const,

  radar: (opts?: { category?: string; kind?: string; sort?: "recommended" | "recent" }) =>
    opts && (opts.category || opts.kind || opts.sort)
      ? (["radar", opts] as const)
      : (["radar"] as const),

  savedItems: ["library", "saved"] as const,
  notes: ["library", "notes"] as const,
  paperSearch: (input: PapersSearchInput) => ["paperSearch", input] as const,

  /** A specific resource by id — used by the reader. */
  resourceById: (id: string) => ["resources", "by-id", id] as const,
  /** Resolved reader content (manifest + ordered blocks + translation for locale). */
  resourceContent: (resourceId: string, locale: string) =>
    ["reader", resourceId, locale] as const,

  quizzes: ["practice", "quizzes"] as const,
  quizBySlug: (slug: string) => ["practice", "quizzes", "by-slug", slug] as const,

  buildLab: (kind?: string) =>
    kind ? (["build-lab", { kind }] as const) : (["build-lab"] as const),

  basecampProjects: (opts?: { aiOnly?: boolean }) =>
    opts?.aiOnly ? (["basecamp", "projects", { aiOnly: true }] as const) : (["basecamp", "projects"] as const),
  basecampActivity: (opts?: { aiOnly?: boolean; limit?: number }) =>
    opts ? (["basecamp", "activity", opts] as const) : (["basecamp", "activity"] as const),
  basecampWorkspace: ["basecamp", "workspace"] as const,

  llmModels: (opts?: { license?: string; tab?: string; sort?: string }) =>
    opts && Object.keys(opts).length > 0
      ? (["llm-models", opts] as const)
      : (["llm-models"] as const),
  llmModelBySlug: (slug: string) => ["llm-models", "by-slug", slug] as const,
  llmModelsMeta: ["llm-models", "meta"] as const,
} as const;

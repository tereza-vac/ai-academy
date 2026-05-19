/** Centralised TanStack Query keys so cache invalidation stays consistent. */
export const queryKeys = {
  tracks: ["tracks"] as const,
  topics: ["topics"] as const,
  topicBySlug: (slug: string) => ["topics", "by-slug", slug] as const,

  resources: (opts?: { topicId?: string }) =>
    opts?.topicId ? (["resources", { topicId: opts.topicId }] as const) : (["resources"] as const),

  radar: (opts?: { category?: string }) =>
    opts?.category ? (["radar", { category: opts.category }] as const) : (["radar"] as const),

  savedItems: ["library", "saved"] as const,
  notes: ["library", "notes"] as const,

  quizzes: ["practice", "quizzes"] as const,
  quizBySlug: (slug: string) => ["practice", "quizzes", "by-slug", slug] as const,

  buildLab: (kind?: string) =>
    kind ? (["build-lab", { kind }] as const) : (["build-lab"] as const),
} as const;

import type { NamespacePaperSearchTranslation } from "../../i18n-types";

const en_paperSearch: NamespacePaperSearchTranslation = {
  eyebrow: "Paper search",
  title: "Search the academic literature",
  description: "Combines results from Semantic Scholar, OpenAlex and arXiv, deduped by DOI and arXiv id.",

  searchPlaceholder: "e.g. \"chain of thought prompting\" or \"direct preference optimization\"",
  searchAction: "Search",
  searching: "Searching…",

  filtersTitle: "Filters",
  yearMinLabel: "From year",
  yearMaxLabel: "To year",
  minCitationsLabel: "Min citations",
  sortLabel: "Sort by",
  sortRelevance: "Relevance",
  sortCitations: "Most cited",
  sortYear: "Newest",
  reset: "Clear filters",

  resultsHeader: "{count|num} {{result|results}}",
  emptyTitle: "No matches",
  emptyDescription: "Try a broader query or relax the filters.",
  startTitle: "Start by typing a query",
  startDescription: "You can search keywords, phrases, authors or a paper title.",
  upstreamWarning: "Some upstreams failed: {sources}",

  citationsLabel: "{count|num} {{citation|citations}}",
  yearLabel: "{year|num}",
  pdfLabel: "PDF",
  sourceLabel: "Source",
  saveAction: "Save",
  savedAction: "Saved",
  saveFailed: "Save failed",
  savedToast: "Saved to Library",
};

export default en_paperSearch;

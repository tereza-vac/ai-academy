import type { NamespacePaperSearchTranslation } from "../../i18n-types";

const pl_paperSearch: NamespacePaperSearchTranslation = {
  eyebrow: "Wyszukiwanie prac",
  title: "Przeszukaj literaturę naukową",
  description: "Łączy wyniki z Semantic Scholar, OpenAlex i arXiv, deduplikowane po DOI i ID arXiv.",

  searchPlaceholder: "np. „chain of thought prompting” lub „direct preference optimization”",
  searchAction: "Szukaj",
  searching: "Szukam…",

  filtersTitle: "Filtry",
  yearMinLabel: "Od roku",
  yearMaxLabel: "Do roku",
  minCitationsLabel: "Min. cytowań",
  sortLabel: "Sortuj",
  sortRelevance: "Trafność",
  sortCitations: "Najczęściej cytowane",
  sortYear: "Najnowsze",
  reset: "Wyczyść filtry",

  resultsHeader: "{count|num} {{wynik|wyniki|wyników}}",
  emptyTitle: "Brak wyników",
  emptyDescription: "Spróbuj szerszego zapytania lub poluzuj filtry.",
  startTitle: "Wpisz zapytanie, aby zacząć",
  startDescription: "Możesz szukać słów kluczowych, fraz, autorów lub tytułu pracy.",
  upstreamWarning: "Niektóre źródła zawiodły: {sources}",

  citationsLabel: "{count|num} {{cytowanie|cytowania|cytowań}}",
  yearLabel: "{year|num}",
  pdfLabel: "PDF",
  sourceLabel: "Źródło",
  saveAction: "Zapisz",
  savedAction: "Zapisane",
  saveFailed: "Zapis nie powiódł się",
  savedToast: "Zapisano do Biblioteki",
};

export default pl_paperSearch;

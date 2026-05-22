import type { NamespacePaperSearchTranslation } from "../../i18n-types";

const sk_paperSearch: NamespacePaperSearchTranslation = {
  eyebrow: "Vyhľadávanie publikácií",
  title: "Hľadajte odbornú literatúru",
  description: "Spája výsledky zo Semantic Scholar, OpenAlex a arXiv a deduplikuje ich podľa DOI a arXiv ID.",

  searchPlaceholder: "napr. „chain of thought prompting“ alebo „direct preference optimization“",
  searchAction: "Hľadať",
  searching: "Hľadám…",

  filtersTitle: "Filtre",
  yearMinLabel: "Od roku",
  yearMaxLabel: "Do roku",
  minCitationsLabel: "Min. citácií",
  sortLabel: "Zoradiť",
  sortRelevance: "Relevancia",
  sortCitations: "Najviac citované",
  sortYear: "Najnovšie",
  reset: "Vymazať filtre",

  resultsHeader: "{count|num} {{výsledok|výsledky|výsledkov}}",
  emptyTitle: "Žiadne výsledky",
  emptyDescription: "Skúste všeobecnejší dotaz alebo uvoľnite filtre.",
  startTitle: "Začnite písaním dotazu",
  startDescription: "Môžete vyhľadávať kľúčové slová, frázy, autorov alebo názov práce.",
  upstreamWarning: "Niektoré zdroje zlyhali: {sources}",

  citationsLabel: "{count|num} {{citácia|citácie|citácií}}",
  yearLabel: "{year|num}",
  pdfLabel: "PDF",
  sourceLabel: "Zdroj",
  saveAction: "Uložiť",
  savedAction: "Uložené",
  saveFailed: "Uloženie zlyhalo",
  savedToast: "Uložené do Knižnice",
};

export default sk_paperSearch;

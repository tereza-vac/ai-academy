import type { BaseTranslation } from "../../i18n-types";

const cs_paperSearch: BaseTranslation = {
  eyebrow: "Vyhledávání publikací",
  title: "Hledejte odbornou literaturu",
  description: "Spojuje výsledky ze Semantic Scholar, OpenAlex a arXiv a deduplikuje je podle DOI a arXiv ID.",

  searchPlaceholder: "např. „chain of thought prompting“ nebo „direct preference optimization“",
  searchAction: "Hledat",
  searching: "Hledám…",

  filtersTitle: "Filtry",
  yearMinLabel: "Od roku",
  yearMaxLabel: "Do roku",
  minCitationsLabel: "Min. citací",
  sortLabel: "Řadit",
  sortRelevance: "Relevance",
  sortCitations: "Nejvíc citované",
  sortYear: "Nejnovější",
  reset: "Vymazat filtry",

  resultsHeader: "Výsledků: {count|num}",
  emptyTitle: "Žádné výsledky",
  emptyDescription: "Zkuste obecnější dotaz nebo uvolněte filtry.",
  startTitle: "Začněte psát dotaz",
  startDescription: "Můžete vyhledávat klíčová slova, fráze, autory nebo název práce.",
  upstreamWarning: "Některé zdroje selhaly: {sources}",

  // Result card
  citationsLabel: "{count|num} {{citace|citace|citací}}",
  yearLabel: "{year|num}",
  pdfLabel: "PDF",
  sourceLabel: "Zdroj",
  saveAction: "Uložit",
  savedAction: "Uloženo",
  saveFailed: "Uložení selhalo",
  savedToast: "Uloženo do Knihovny",
};

export default cs_paperSearch;

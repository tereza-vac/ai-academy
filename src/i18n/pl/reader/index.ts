import type { BaseTranslation } from "../../i18n-types";

const pl_reader: BaseTranslation = {
  eyebrow: "Czytnik",

  openInternal: "Czytaj w AI Academy",
  openOriginal: "Oryginalne źródło",
  openOriginalAria: "Otwórz oryginalne źródło w nowej karcie",

  back: "Wstecz",
  sourceLabel: "Źródło: {name}",
  publishedLabel: "Opublikowano {date}",
  authorLabel: "Autor: {author}",
  licenseLabel: "Licencja: {license}",

  translateAction: "Przetłumacz na {locale}",
  translatingNow: "Tłumaczę…",
  translateFailed: "Tłumaczenie nie powiodło się",
  translatedBy: "Tłumaczone przez {provider}",
  translatedFromSource: "Przetłumaczone z języka {sourceLang}",
  showSource: "Pokaż w języku oryginału",

  loading: "Ładowanie artykułu…",
  notReadyTitle: "Ten artykuł nie jest jeszcze gotowy do czytania",
  notReadyDescription:
    "Pracujemy nad jego importem. Możesz w międzyczasie otworzyć oryginalne źródło.",
  importFailedTitle: "Nie udało się zaimportować artykułu",
  importFailedDescription:
    "Spróbujemy ponownie później. Oryginalne źródło jest nadal dostępne.",
  notFoundTitle: "Nie znaleziono artykułu",
  notFoundDescription: "Zasób mógł zostać usunięty.",

  availabilityMetadataOnly: "Tylko metadane",
  availabilityExcerptOnly: "Tylko fragment",
  availabilityUnavailable: "Pełny tekst niedostępny",
};

export default pl_reader;

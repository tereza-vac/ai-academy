import type { BaseTranslation } from "../../i18n-types";

const sk_reader: BaseTranslation = {
  eyebrow: "Čítačka",

  openInternal: "Čítať v AI Academy",
  openOriginal: "Pôvodný zdroj",
  openOriginalAria: "Otvoriť pôvodný zdroj v novej karte",

  back: "Späť",
  sourceLabel: "Zdroj: {name}",
  publishedLabel: "Publikované {date}",
  authorLabel: "Autor: {author}",
  licenseLabel: "Licencia: {license}",

  translateAction: "Preložiť do {locale}",
  translatingNow: "Prekladám…",
  translateFailed: "Preklad zlyhal",
  translatedBy: "Preložil {provider}",
  translatedFromSource: "Preložené z jazyka {sourceLang}",
  showSource: "Zobraziť v pôvodnom jazyku",

  loading: "Načítavam článok…",
  notReadyTitle: "Tento článok ešte nie je pripravený na čítanie",
  notReadyDescription:
    "Pracujeme na jeho importe. Medzitým môžete otvoriť pôvodný zdroj.",
  importFailedTitle: "Článok sa nepodarilo importovať",
  importFailedDescription:
    "Skúsime to znova neskôr. Pôvodný zdroj je stále dostupný.",
  notFoundTitle: "Článok sa nenašiel",
  notFoundDescription: "Zdroj mohol byť odstránený.",

  availabilityMetadataOnly: "Iba metadáta",
  availabilityExcerptOnly: "Iba ukážka",
  availabilityUnavailable: "Plný text nie je dostupný",
};

export default sk_reader;

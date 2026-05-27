import type { BaseTranslation } from "../../i18n-types";

const cs_reader: BaseTranslation = {
  eyebrow: "Čtenář",

  // Card / link labels (used on Radar, Scholar, Library cards)
  openInternal: "Číst v AI Academy",
  openOriginal: "Původní zdroj",
  openOriginalAria: "Otevřít původní zdroj v novém okně",

  // Reader-page chrome
  back: "Zpět",
  sourceLabel: "Zdroj: {name}",
  publishedLabel: "Publikováno {date}",
  authorLabel: "Autor: {author}",
  licenseLabel: "Licence: {license}",

  // Translation strip
  translateAction: "Přeložit do {locale}",
  translatingNow: "Překládám…",
  translateFailed: "Překlad se nezdařil",
  translatedBy: "Přeložil {provider}",
  translatedFromSource: "Přeloženo z jazyka {sourceLang}",
  showSource: "Zobrazit původní jazyk",

  // States
  loading: "Načítám článek…",
  notReadyTitle: "Tento článek ještě není připraven ke čtení",
  notReadyDescription:
    "Pracujeme na jeho importu. Mezitím můžete otevřít původní zdroj.",
  importFailedTitle: "Nepodařilo se importovat článek",
  importFailedDescription:
    "Zkusíme to znovu později. Původní zdroj je stále dostupný.",
  notFoundTitle: "Článek nebyl nalezen",
  notFoundDescription: "Zdroj mohl být odstraněn.",

  // Availability labels (used in card hints + tooltips)
  availabilityMetadataOnly: "Pouze metadata",
  availabilityExcerptOnly: "Pouze úryvek",
  availabilityUnavailable: "Plný text není dostupný",
};

export default cs_reader;

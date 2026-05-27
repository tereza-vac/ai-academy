import type { BaseTranslation } from "../../i18n-types";

const en_reader: BaseTranslation = {
  eyebrow: "Reader",

  openInternal: "Read in AI Academy",
  openOriginal: "Original source",
  openOriginalAria: "Open original source in a new tab",

  back: "Back",
  sourceLabel: "Source: {name}",
  publishedLabel: "Published {date}",
  authorLabel: "By {author}",
  licenseLabel: "License: {license}",

  translateAction: "Translate to {locale}",
  translatingNow: "Translating…",
  translateFailed: "Translation failed",
  translatedBy: "Translated by {provider}",
  translatedFromSource: "Translated from {sourceLang}",
  showSource: "Show in original language",

  loading: "Loading article…",
  notReadyTitle: "This article isn't ready to read yet",
  notReadyDescription:
    "We're importing it now. You can open the original source in the meantime.",
  importFailedTitle: "Couldn't import this article",
  importFailedDescription:
    "We'll retry later. The original source is still available.",
  notFoundTitle: "Article not found",
  notFoundDescription: "The resource may have been removed.",

  availabilityMetadataOnly: "Metadata only",
  availabilityExcerptOnly: "Excerpt only",
  availabilityUnavailable: "Full text unavailable",
};

export default en_reader;

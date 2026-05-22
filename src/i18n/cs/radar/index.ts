import type { BaseTranslation } from "../../i18n-types";

const cs_radar: BaseTranslation = {
  eyebrow: "Radar",
  title: "Co je nového v AI",
  description: "Souhrn článků, novinek a vědeckých prací z našich důvěryhodných zdrojů.",
  emptyTitle: "Zatím nic nového",
  emptyDescription: "Až dorazí čerstvé položky, objeví se zde.",
  errorTitle: "Nepodařilo se načíst Radar",

  searchPlaceholder: "Hledat v titulku, popisu, štítcích…",
  refresh: "Obnovit",

  // Sort + tab labels
  sortRecommended: "Doporučené",
  sortRecent: "Nejnovější",
  tabAll: "Vše",
  tabPapers: "Práce",
  tabReleases: "Vydání",
  tabBlogs: "Blogy",
  tabCommunity: "Komunita",
  tabTools: "Nástroje",

  // Card metadata
  upvotesLabel: "{count|num} {{hlas|hlasy|hlasů}} na HF",
  externalIdLabel: "ID: {id}",
  scoreLabel: "Skóre: {score}",

  // Save flow
  savedToast: "Uloženo do Knihovny",
  removedToast: "Odebráno z Knihovny",
  saveFailed: "Uložení selhalo",
  saveAction: "Uložit do Knihovny",
  unsaveAction: "Odebrat z Knihovny",
  openExternal: "Otevřít zdroj",
};

export default cs_radar;

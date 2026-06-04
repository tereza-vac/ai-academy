import type { BaseTranslation } from "../../i18n-types";

/**
 * Sidebar navigation labels.
 *
 * The keys are suffixed with `Link` to avoid clashing with namespace names
 * (typesafe-i18n forbids reusing namespace names as flat keys).
 */
const cs_nav: BaseTranslation = {
  homeLink: "Domů",
  learnLink: "Učení",
  mapLink: "Mapa AI",
  tutorLink: "AI Tutor",
  teamLink: "Tým",
  radarLink: "Radar",
  libraryLink: "Knihovna",
  papersLink: "Publikace",
  practiceLink: "Procvičování",
  buildLabLink: "Build Lab",
  expandSidebar: "Rozbalit panel",
  collapseSidebar: "Sbalit panel",
};

export default cs_nav;

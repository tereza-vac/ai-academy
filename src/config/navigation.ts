import {
  BookOpen,
  Radar as RadarIcon,
  Library,
  Brain,
  Wrench,
  LayoutDashboard,
} from "lucide-react";
import type { TranslationFunctions } from "@/i18n/i18n-types";

export interface NavItem {
  /** Key into the `nav` translation namespace. */
  labelKey: keyof TranslationFunctions["nav"];
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const sidebarNavigation: NavItem[] = [
  { labelKey: "homeLink",     href: "/",          icon: LayoutDashboard },
  { labelKey: "learnLink",    href: "/learn",     icon: BookOpen },
  { labelKey: "radarLink",    href: "/radar",     icon: RadarIcon },
  { labelKey: "libraryLink",  href: "/library",   icon: Library },
  { labelKey: "practiceLink", href: "/practice",  icon: Brain },
  { labelKey: "buildLabLink", href: "/build-lab", icon: Wrench },
];

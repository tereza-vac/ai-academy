import {
  BookOpen,
  Radar as RadarIcon,
  Library,
  Brain,
  Wrench,
  LayoutDashboard,
  Network,
  Users,
  MessageSquareText,
  FileSearch,
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
  { labelKey: "mapLink",      href: "/map",       icon: Network },
  { labelKey: "tutorLink",    href: "/tutor",     icon: MessageSquareText },
  { labelKey: "teamLink",     href: "/team",      icon: Users },
  { labelKey: "radarLink",    href: "/radar",     icon: RadarIcon },
  { labelKey: "libraryLink",  href: "/library",   icon: Library },
  { labelKey: "papersLink",   href: "/papers",    icon: FileSearch },
  { labelKey: "practiceLink", href: "/practice",  icon: Brain },
  { labelKey: "buildLabLink", href: "/build-lab", icon: Wrench },
];

import {
  BookOpen,
  Radar as RadarIcon,
  Library,
  Brain,
  Wrench,
  LayoutDashboard,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const sidebarNavigation: NavItem[] = [
  { label: "Home",      href: "/",          icon: LayoutDashboard },
  { label: "Learn",     href: "/learn",     icon: BookOpen },
  { label: "Radar",     href: "/radar",     icon: RadarIcon },
  { label: "Library",   href: "/library",   icon: Library },
  { label: "Practice",  href: "/practice",  icon: Brain },
  { label: "Build Lab", href: "/build-lab", icon: Wrench },
];

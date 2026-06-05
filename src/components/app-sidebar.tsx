import { NavLink } from "react-router-dom";
import { Award, GraduationCap, MapPin, PanelLeftClose, PanelLeftOpen, Search, Sparkles, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarNavigation } from "@/config/navigation";
import { dueCount } from "@/services/flashcards";
import { useUIStore } from "@/stores/uiStore";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import { useI18nContext } from "@/i18n/i18n-react";

function navItemClass(isActive: boolean, collapsed: boolean) {
  return cn(
    "group/navitem relative flex h-9 items-center gap-2.5 rounded-lg text-body-md font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
    collapsed ? "justify-center px-0" : "px-3",
    isActive
      ? "bg-brand-soft font-semibold text-primary"
      : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
  );
}

function ActiveBar({ isActive, collapsed }: { isActive: boolean; collapsed: boolean }) {
  if (collapsed || !isActive) return null;
  return (
    <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
  );
}

function Logo({ collapsed }: { collapsed: boolean }) {
  const { LL } = useI18nContext();
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow-brand">
        <Sparkles className="h-4 w-4" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-body-md font-semibold tracking-tight text-content-primary">
            {LL.common.appName()}
          </div>
          <div className="text-caption-xs text-content-tertiary">{LL.common.tagline()}</div>
        </div>
      )}
    </div>
  );
}

interface AppSidebarProps {
  onOpenPalette?: () => void;
}

function FlashcardsNavItem({ collapsed }: { collapsed: boolean }) {
  const { LL } = useI18nContext();
  const due = dueCount();
  const label = LL.nav.flashcardsLink();
  return (
    <NavLink
      to="/flashcards"
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) => navItemClass(isActive, collapsed)}
    >
      {({ isActive }) => (
        <>
          <ActiveBar isActive={isActive} collapsed={collapsed} />
          <div className="relative">
            <GraduationCap className="h-4 w-4" />
            {due > 0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[hsl(var(--premium))] text-[8px] font-bold text-white">
                {due > 9 ? "9" : due}
              </span>
            )}
          </div>
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
          {!collapsed && due > 0 && (
            <span className="rounded-full bg-premium-soft px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--premium))]">
              {due}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SimpleNavItem({
  to,
  label,
  icon: Icon,
  collapsed,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) => navItemClass(isActive, collapsed)}
    >
      {({ isActive }) => (
        <>
          <ActiveBar isActive={isActive} collapsed={collapsed} />
          <Icon className="h-4 w-4" />
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

export function AppSidebar({ onOpenPalette }: AppSidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const { LL } = useI18nContext();

  return (
    <aside
      className={cn(
        "h-screen shrink-0 border-r border-border-subtle bg-sidebar transition-[width] duration-300 ease-in-out",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex h-14 items-center transition-all duration-300",
            collapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          {!collapsed && <Logo collapsed={collapsed} />}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? LL.nav.expandSidebar() : LL.nav.collapseSidebar()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Search / command palette trigger */}
        <div className={cn("shrink-0 border-b border-border-subtle", collapsed ? "p-2" : "px-3 py-2")}>
          <button
            type="button"
            onClick={onOpenPalette}
            title={`${LL.nav.searchPlaceholder()} (\u2318K)`}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-border-subtle text-content-tertiary transition-colors",
              "hover:border-border-strong hover:text-content-secondary hover:bg-surface-hover",
              "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
              collapsed ? "h-9 justify-center px-0" : "h-8 px-2.5",
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-caption-xs">{LL.nav.searchPlaceholder()}</span>
                <kbd className="text-[10px] border border-border-subtle rounded px-1 py-0.5 leading-none">{"\u2318K"}</kbd>
              </>
            )}
          </button>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
          {sidebarNavigation.map((item) => {
            const Icon = item.icon as LucideIcon;
            const label = LL.nav[item.labelKey]();
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) => navItemClass(isActive, collapsed)}
              >
                {({ isActive }) => (
                  <>
                    <ActiveBar isActive={isActive} collapsed={collapsed} />
                    <Icon className="h-4 w-4" />
                    {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}

          <FlashcardsNavItem collapsed={collapsed} />
          <SimpleNavItem to="/progress" label={LL.nav.progressLink()} icon={TrendingUp} collapsed={collapsed} />
          <SimpleNavItem to="/achievements" label={LL.nav.achievementsLink()} icon={Award} collapsed={collapsed} />
          <SimpleNavItem to="/plan" label={LL.nav.planLink()} icon={MapPin} collapsed={collapsed} />
        </nav>

        <div className={cn("border-t border-border-subtle", collapsed ? "flex justify-center p-2" : "p-3")}>
          <SidebarUserMenu collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}

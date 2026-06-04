import { NavLink } from "react-router-dom";
import { Award, GraduationCap, MapPin, MessageSquare, PanelLeftClose, PanelLeftOpen, Search, Sparkles, TrendingUp } from "lucide-react";
import { useChatWidgetStore } from "@/stores/chatWidgetStore";
import { cn } from "@/lib/utils";
import { sidebarNavigation } from "@/config/navigation";
import { dueCount } from "@/services/flashcards";
import { useUIStore } from "@/stores/uiStore";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import { useI18nContext } from "@/i18n/i18n-react";

function Logo({ collapsed }: { collapsed: boolean }) {
  const { LL } = useI18nContext();
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-elevation-sm">
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
  const due = dueCount();
  return (
    <NavLink
      to="/flashcards"
      aria-label={collapsed ? "Flashcards" : undefined}
      className={({ isActive }) =>
        cn(
          "flex h-9 items-center gap-2.5 rounded-lg text-body-md font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
          collapsed ? "justify-center px-0" : "px-3",
          isActive
            ? "bg-surface-hover font-semibold text-content-primary"
            : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
        )
      }
    >
      <div className="relative">
        <GraduationCap className="h-4 w-4" />
        {due > 0 && (
          <span className="pointer-events-none absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white">
            {due > 9 ? "9" : due}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className="flex-1 truncate">Flashcards</span>
      )}
      {!collapsed && due > 0 && (
        <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-300/40 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-400">
          {due}
        </span>
      )}
    </NavLink>
  );
}

function ChatButton({ collapsed }: { collapsed: boolean }) {
  const toggle = useChatWidgetStore((s) => s.toggle);
  const isOpen = useChatWidgetStore((s) => s.isOpen);

  return (
    <div className={cn("shrink-0 border-t border-border-subtle", collapsed ? "p-2" : "px-3 py-2.5")}>
      <button
        type="button"
        onClick={toggle}
        title="AI Tutor Chat"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl transition-all duration-150 outline-none",
          "focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
          collapsed
            ? "h-9 justify-center px-0 text-content-secondary hover:bg-surface-hover hover:text-content-primary"
            : cn(
                "px-3 py-2 text-left",
                isOpen
                  ? "bg-primary/10 text-primary"
                  : "bg-gradient-to-r from-primary/8 to-transparent border border-primary/15 text-primary hover:from-primary/15 hover:border-primary/30",
              ),
        )}
      >
        <div className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          collapsed ? "h-5 w-5" : "h-6 w-6",
          !collapsed && "bg-primary/15",
        )}>
          <MessageSquare className={cn(collapsed ? "h-4 w-4" : "h-3.5 w-3.5")} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-caption-xs font-semibold leading-tight truncate">AI Tutor</p>
            <p className="text-[10px] text-primary/60 leading-tight">Zeptej se čehokoliv</p>
          </div>
        )}
        {!collapsed && (
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
            ✦
          </span>
        )}
      </button>
    </div>
  );
}

export function AppSidebar({ onOpenPalette }: AppSidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const { LL } = useI18nContext();

  return (
    <aside
      className={cn(
        "h-screen shrink-0 bg-sidebar transition-[width] duration-300 ease-in-out",
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
            title="Search (⌘K)"
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
                <span className="flex-1 text-left text-caption-xs">Search…</span>
                <kbd className="text-[10px] border border-border-subtle rounded px-1 py-0.5 leading-none">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
          {sidebarNavigation.map((item) => {
            const Icon = item.icon;
            const label = LL.nav[item.labelKey]();
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 items-center gap-2.5 rounded-lg text-body-md font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                    collapsed ? "justify-center px-0" : "px-3",
                    isActive
                      ? "bg-surface-hover font-semibold text-content-primary"
                      : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
              </NavLink>
            );
          })}

          {/* Flashcards — sub-item below tutor */}
          <FlashcardsNavItem collapsed={collapsed} />

          {/* Progress dashboard */}
          <NavLink
            to="/progress"
            aria-label={collapsed ? "Progress" : undefined}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center gap-2.5 rounded-lg text-body-md font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-surface-hover font-semibold text-content-primary"
                  : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
              )
            }
          >
            <TrendingUp className="h-4 w-4" />
            {!collapsed && <span className="flex-1 truncate">Progress</span>}
          </NavLink>

          {/* Achievements */}
          <NavLink
            to="/achievements"
            aria-label={collapsed ? "Achievements" : undefined}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center gap-2.5 rounded-lg text-body-md font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-surface-hover font-semibold text-content-primary"
                  : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
              )
            }
          >
            <Award className="h-4 w-4" />
            {!collapsed && <span className="flex-1 truncate">Achievements</span>}
          </NavLink>

          {/* Study plans */}
          <NavLink
            to="/plan"
            aria-label={collapsed ? "Study Plans" : undefined}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center gap-2.5 rounded-lg text-body-md font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-surface-hover font-semibold text-content-primary"
                  : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
              )
            }
          >
            <MapPin className="h-4 w-4" />
            {!collapsed && <span className="flex-1 truncate">Study Plans</span>}
          </NavLink>
        </nav>

        {/* AI Chat quick-launch */}
        <ChatButton collapsed={collapsed} />

        <div className={cn("border-t border-border-subtle", collapsed ? "flex justify-center p-2" : "p-3")}>
          <SidebarUserMenu collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}

import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarNavigation } from "@/config/navigation";
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

export function AppSidebar() {
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
        </nav>

        <div className={cn("border-t border-border-subtle", collapsed ? "flex justify-center p-2" : "p-3")}>
          <SidebarUserMenu collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}

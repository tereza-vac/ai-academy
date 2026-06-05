import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronsUpDown,
  Copy,
  Globe,
  Keyboard,
  Laptop,
  LogIn,
  LogOut,
  Moon,
  Palette,
  Settings,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isMock } from "@/lib/dataMode";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/services/authApi";
import {
  localeNames,
  selectAvailableLocales,
  selectLocale,
  useLocaleStore,
  type Locales,
} from "@/stores/localeStore";
import { useI18nContext } from "@/i18n/i18n-react";

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function Avatar({
  name,
  email,
  avatarUrl,
  size = "md",
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-caption-xs";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground font-semibold shadow-elevation-sm",
        cls,
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name, email)
      )}
    </div>
  );
}

function ThemeSubMenu() {
  const { LL } = useI18nContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const value = (theme ?? "system") as "light" | "dark" | "system";
  const summary =
    value === "light"
      ? LL.userMenu.themeLight()
      : value === "dark"
        ? LL.userMenu.themeDark()
        : `${LL.userMenu.themeSystem()} · ${
            resolvedTheme === "dark" ? LL.userMenu.themeDark() : LL.userMenu.themeLight()
          }`;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette />
        <span className="flex-1">{LL.userMenu.appearance()}</span>
        <span className="ml-auto text-caption-xs text-content-tertiary">{summary}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent sideOffset={6} alignOffset={-4}>
          <DropdownMenuLabel>{LL.userMenu.theme()}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}
          >
            <DropdownMenuRadioItem value="light">
              <Sun className="mr-2 h-4 w-4 text-content-tertiary" />
              {LL.userMenu.themeLight()}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="mr-2 h-4 w-4 text-content-tertiary" />
              {LL.userMenu.themeDark()}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Laptop className="mr-2 h-4 w-4 text-content-tertiary" />
              {LL.userMenu.themeSystem()}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

function LanguageSubMenu() {
  const { LL } = useI18nContext();
  const locale = useLocaleStore(selectLocale);
  const available = useLocaleStore(selectAvailableLocales);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Globe />
        <span className="flex-1">{LL.userMenu.language()}</span>
        <span className="ml-auto text-caption-xs text-content-tertiary">
          {localeNames[locale]}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent sideOffset={6} alignOffset={-4}>
          <DropdownMenuLabel>{LL.userMenu.language()}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(v) => setLocale(v as Locales)}
          >
            {available.map((l) => (
              <DropdownMenuRadioItem key={l} value={l}>
                {localeNames[l]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const { LL } = useI18nContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Suppress hydration shift on theme-derived label inside the dropdown
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  void mounted;

  async function handleSignOut() {
    try {
      await signOut();
      toast.success(LL.userMenu.signedOut());
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : LL.userMenu.signOutFailed());
    }
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(LL.userMenu.copiedEmail());
    } catch {
      toast.error(LL.userMenu.copyEmailFailed());
    }
  }

  // Mock mode + signed-out users
  if (!user) {
    if (isMock) {
      return collapsed ? (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-content-tertiary"
          title={LL.userMenu.demoModeTitle()}
        >
          <UserIcon className="h-4 w-4" />
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-body-sm text-content-secondary">
          <div className="font-medium text-content-primary">{LL.userMenu.demoModeTitle()}</div>
          <div className="text-caption-xs text-content-tertiary">
            {LL.userMenu.demoModeDescription()}
          </div>
        </div>
      );
    }
    return collapsed ? (
      <Button asChild variant="ghost" size="icon-sm" aria-label={LL.userMenu.signIn()}>
        <Link to="/login">
          <LogIn className="h-4 w-4" />
        </Link>
      </Button>
    ) : (
      <Button asChild variant="outline" className="w-full">
        <Link to="/login">
          <LogIn className="h-4 w-4" />
          {LL.userMenu.signIn()}
        </Link>
      </Button>
    );
  }

  const display = user.displayName ?? user.email.split("@")[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={LL.userMenu.trigger()}
          className={cn(
            "group flex w-full items-center gap-2 rounded-xl text-left transition-colors outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
            collapsed
              ? "h-9 w-9 justify-center"
              : "h-12 border border-border-subtle bg-surface-elevated px-1.5 pr-1 hover:bg-surface-hover",
          )}
        >
          <Avatar
            name={user.displayName}
            email={user.email}
            avatarUrl={user.avatarUrl}
            size={collapsed ? "md" : "sm"}
          />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-body-sm font-semibold text-content-primary">
                  {display}
                </div>
                <div className="truncate text-caption-xs text-content-tertiary">
                  {user.email}
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-content-tertiary transition-colors group-hover:text-content-primary" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "end" : "start"}
        sideOffset={8}
        className="w-64"
      >
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar
            name={user.displayName}
            email={user.email}
            avatarUrl={user.avatarUrl}
          />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-body-sm font-semibold text-content-primary">
              {display}
            </div>
            <div className="truncate text-caption-xs text-content-tertiary">
              {user.email}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <ThemeSubMenu />
        <LanguageSubMenu />

        <DropdownMenuItem onSelect={() => copyEmail(user.email)}>
          <Copy />
          <span>{LL.userMenu.copyEmail()}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            toast(LL.userMenu.keyboardShortcutsToast(), {
              description: LL.userMenu.keyboardShortcutsHint(),
            });
          }}
        >
          <Keyboard />
          <span>{LL.userMenu.keyboardShortcuts()}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings />
          <span>{LL.nav.settingsLink()}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onSelect={handleSignOut}>
          <LogOut />
          <span>{LL.userMenu.signOut()}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

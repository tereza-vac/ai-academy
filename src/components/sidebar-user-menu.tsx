import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronsUpDown,
  Copy,
  Keyboard,
  Laptop,
  LogIn,
  LogOut,
  Moon,
  Palette,
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  // `theme` is undefined until next-themes hydrates — fall back to "system".
  const value = (theme ?? "system") as "light" | "dark" | "system";
  const effective = resolvedTheme === "dark" ? "Dark" : "Light";

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette />
        <span className="flex-1">Appearance</span>
        <span className="ml-auto text-caption-xs text-content-tertiary">
          {value === "system" ? `System · ${effective}` : value === "dark" ? "Dark" : "Light"}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent sideOffset={6} alignOffset={-4}>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}
          >
            <DropdownMenuRadioItem value="light">
              <Sun className="mr-2 h-4 w-4 text-content-tertiary" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="mr-2 h-4 w-4 text-content-tertiary" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Laptop className="mr-2 h-4 w-4 text-content-tertiary" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Avoid SSR/hydration mismatch on the trigger label that reads from next-themes
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign out failed");
    }
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied");
    } catch {
      toast.error("Couldn't copy email");
    }
  }

  // Mock mode and signed-out users get a lightweight CTA.
  if (!user) {
    if (isMock) {
      return collapsed ? (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-content-tertiary"
          title="Demo mode (no auth)"
        >
          <UserIcon className="h-4 w-4" />
        </div>
      ) : (
        <DemoCard />
      );
    }
    return collapsed ? (
      <Button asChild variant="ghost" size="icon-sm" aria-label="Sign in">
        <Link to="/login">
          <LogIn className="h-4 w-4" />
        </Link>
      </Button>
    ) : (
      <Button asChild variant="outline" className="w-full">
        <Link to="/login">
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
      </Button>
    );
  }

  const display = user.displayName ?? user.email.split("@")[0];

  // Tiny lock to keep theme picker label stable until mounted
  void mounted;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${display} menu`}
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

        <DropdownMenuItem onSelect={() => copyEmail(user.email)}>
          <Copy />
          <span>Copy email</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            toast("Keyboard shortcuts coming soon", {
              description: "Press / to focus search (when we ship it).",
            });
          }}
        >
          <Keyboard />
          <span>Keyboard shortcuts</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onSelect={handleSignOut}>
          <LogOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DemoCard() {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-body-sm text-content-secondary">
      <div className="font-medium text-content-primary">Demo mode</div>
      <div className="text-caption-xs text-content-tertiary">
        Configure Supabase to enable sign-in.
      </div>
    </div>
  );
}

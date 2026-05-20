import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/services/authApi";
import { isMock } from "@/lib/dataMode";

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign out failed");
    }
  }

  // Mock mode: no real auth available — show a quiet "demo" pill
  if (isMock && !user) {
    if (collapsed) {
      return (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-content-tertiary"
          title="Demo mode (no auth)"
        >
          <UserIcon className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-elevated p-2.5 text-body-sm text-content-secondary">
        <div className="font-medium text-content-primary">Demo mode</div>
        <div className="text-caption-xs text-content-tertiary">
          Configure Supabase to enable sign-in.
        </div>
      </div>
    );
  }

  if (!user) {
    if (collapsed) {
      return (
        <Button asChild variant="ghost" size="icon-sm" aria-label="Sign in">
          <Link to="/login">
            <LogIn className="h-4 w-4" />
          </Link>
        </Button>
      );
    }
    return (
      <Button asChild variant="outline" className="w-full">
        <Link to="/login">
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
      </Button>
    );
  }

  const label = initials(user.displayName, user.email);
  const display = user.displayName ?? user.email.split("@")[0];

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        title={`${display} — click to sign out`}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-caption-xs font-semibold shadow-elevation-sm transition-opacity hover:opacity-90"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          label
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-elevated p-2">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-caption-xs font-semibold",
      )}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          label
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-body-sm font-medium text-content-primary">{display}</div>
        <div className="truncate text-caption-xs text-content-tertiary">{user.email}</div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleSignOut}
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

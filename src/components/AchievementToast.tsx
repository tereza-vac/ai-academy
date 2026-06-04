/**
 * AchievementToast — animated slide-in notification when an achievement is unlocked.
 *
 * Renders in the bottom-right corner, auto-dismisses after 5 seconds.
 * Multiple toasts stack vertically.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/services/achievements";

interface ToastItem {
  achievement: Achievement;
  id: string;
}

interface Props {
  queue: ToastItem[];
  onDismiss: (id: string) => void;
  locale?: string;
}

const AUTO_DISMISS_MS = 5000;

function SingleToast({
  item, onDismiss, locale,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
  locale: string;
}) {
  const [visible, setVisible] = useState(false);
  const { achievement } = item;

  // Trigger entry animation on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 400);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [item.id, onDismiss]);

  const title = achievement.title[locale as "cs" | "en"] ?? achievement.title.en;
  const desc = achievement.description[locale as "cs" | "en"] ?? achievement.description.en;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4 shadow-elevation-lg",
        "max-w-xs w-full",
        "transition-all duration-400",
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-8 opacity-0",
      )}
    >
      {/* Emoji badge */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
        {achievement.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-caption-xs font-semibold uppercase tracking-widest text-primary">
          {locale === "cs" ? "Úspěch odemčen!" : "Achievement unlocked!"}
        </p>
        <p className="text-body-sm font-bold text-content-primary">{title}</p>
        <p className="text-caption-xs text-content-tertiary mt-0.5 line-clamp-2">{desc}</p>
      </div>

      <button
        type="button"
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(item.id), 400); }}
        className="shrink-0 rounded-lg p-1 text-content-tertiary/60 hover:bg-surface-hover hover:text-content-secondary transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden rounded-b-2xl">
        <div
          className="h-full bg-primary/40 transition-none"
          style={{
            animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export function AchievementToast({ queue, onDismiss, locale = "en" }: Props) {
  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end">
      {queue.map((item) => (
        <SingleToast key={item.id} item={item} onDismiss={onDismiss} locale={locale} />
      ))}
    </div>
  );
}

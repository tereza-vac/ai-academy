/**
 * TutorSessionHeader — top bar of the tutor chat with session controls.
 */
import { MapPin, RotateCcw, SidebarOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TutorContext } from "@/services/tutorApi";

interface Props {
  context?: TutorContext;
  onReset: () => void;
  onToggleContext?: () => void;
  showContextPanel?: boolean;
  className?: string;
}

const COPY = {
  title: { cs: "AI Tutor", en: "AI Tutor" },
  subtitle: {
    cs: "Tvůj osobní průvodce světem AI",
    en: "Your personal guide to the AI world",
  },
  resetBtn: { cs: "Nová konverzace", en: "New conversation" },
  contextBtn: { cs: "Kontext", en: "Context" },
  contextActive: { cs: "Kontext: aktivní", en: "Context: active" },
};
const t = (key: keyof typeof COPY, locale = "en") =>
  COPY[key][locale as "cs" | "en"] ?? COPY[key]["en"];

export function TutorSessionHeader({
  context,
  onReset,
  onToggleContext,
  showContextPanel,
  className,
}: Props) {
  const locale = context?.locale ?? "en";
  const hasContext = Boolean(context?.conceptId);

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 shrink-0",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="text-sm font-bold text-primary">AI</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-body-md font-semibold text-content-primary">
              {t("title", locale)}
            </span>
            {hasContext && (
              <Badge variant="muted" className="text-caption-xs gap-1 shrink-0">
                <MapPin className="h-2.5 w-2.5" />
                {context?.conceptLabel ?? context?.conceptId}
              </Badge>
            )}
          </div>
          <p className="truncate text-caption-xs text-content-tertiary">
            {t("subtitle", locale)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onReset}
          title={t("resetBtn", locale)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        {onToggleContext && (
          <Button
            variant={showContextPanel ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={onToggleContext}
            title={t("contextBtn", locale)}
          >
            <SidebarOpen className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </header>
  );
}

/**
 * PinnedMessagesPanel — shows all bookmarked AI responses.
 *
 * Displays in a modal/sheet, listing pins sorted by creation date.
 * Each pin shows: preview text, concept label, date, delete button.
 */
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, Tag, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listPins,
  deletePin,
  clearAllPins,
  type PinnedMessage,
} from "@/services/pinnedMessages";
import { TutorMessageContent } from "./TutorMessageContent";

interface Props {
  onClose: () => void;
  locale?: "cs" | "en";
}

const L = {
  title: { cs: "Uložené poznámky", en: "Saved notes" },
  empty: { cs: "Žádné uložené poznámky.", en: "No saved notes yet." },
  emptyHint: {
    cs: "Klikni na záložku u zprávy AI tutora pro uložení.",
    en: "Click the bookmark icon on any AI response to save it here.",
  },
  clearAll: { cs: "Smazat vše", en: "Clear all" },
  delete: { cs: "Smazat", en: "Delete" },
  count: { cs: "uloženo", en: "saved" },
};
const t = (k: keyof typeof L, locale = "en") =>
  L[k][locale as "cs" | "en"] ?? L[k]["en"];

export function PinnedMessagesPanel({ onClose, locale = "en" }: Props) {
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => setPins(listPins()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = useCallback(
    (pinId: string) => {
      deletePin(pinId);
      refresh();
    },
    [refresh],
  );

  const handleClearAll = useCallback(() => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearAllPins();
    refresh();
    setConfirmClear(false);
  }, [confirmClear, refresh]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative flex h-full max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border-subtle bg-surface-elevated shadow-elevation-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <h2 className="text-body-md font-semibold text-content-primary">
              {t("title", locale)}
            </h2>
            {pins.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption-xs text-primary font-medium">
                {pins.length} {t("count", locale)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Bookmark className="h-8 w-8 text-content-tertiary/30" />
              <p className="text-body-sm text-content-tertiary">{t("empty", locale)}</p>
              <p className="text-caption-xs text-content-tertiary/60 text-center max-w-xs">
                {t("emptyHint", locale)}
              </p>
            </div>
          ) : (
            pins.map((pin) => (
              <div
                key={pin.id}
                className={cn(
                  "rounded-xl border border-border-subtle bg-surface-base transition-all",
                  expanded === pin.id ? "shadow-sm" : "",
                )}
              >
                {/* Pin header */}
                <div
                  className="flex items-start gap-3 cursor-pointer px-4 py-3"
                  onClick={() => setExpanded((v) => (v === pin.id ? null : pin.id))}
                >
                  <Bookmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-content-primary line-clamp-2 leading-relaxed">
                      {pin.preview}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {pin.conceptLabel && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-primary/70">
                          <Tag className="h-2.5 w-2.5" />
                          {pin.conceptLabel}
                        </span>
                      )}
                      <span className="text-[10px] text-content-tertiary/60">
                        {formatDistanceToNow(new Date(pin.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(pin.id); }}
                    title={t("delete", locale)}
                    className="shrink-0 rounded-lg p-1 text-content-tertiary transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Expanded content */}
                {expanded === pin.id && (
                  <div className="border-t border-border-subtle px-4 pb-4 pt-3">
                    <TutorMessageContent content={pin.content} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {pins.length > 0 && (
          <div className="shrink-0 border-t border-border-subtle px-4 py-2.5">
            <button
              type="button"
              onClick={handleClearAll}
              className={cn(
                "w-full rounded-lg px-3 py-1.5 text-caption-xs transition-colors",
                confirmClear
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "text-content-tertiary hover:bg-surface-hover hover:text-content-secondary",
              )}
            >
              {confirmClear
                ? locale === "cs" ? "Opravdu smazat vše?" : "Sure? Click again"
                : t("clearAll", locale)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

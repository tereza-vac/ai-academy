/**
 * KeyboardShortcutsHelp — shows all keyboard shortcuts for the AI Tutor.
 * Triggered by pressing `?` when not focused in a text input.
 */
import { useEffect } from "react";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  locale?: "cs" | "en";
}

interface ShortcutGroup {
  title: { cs: string; en: string };
  shortcuts: Array<{
    keys: string[];
    desc: { cs: string; en: string };
  }>;
}

const GROUPS: ShortcutGroup[] = [
  {
    title: { cs: "Konverzace", en: "Conversation" },
    shortcuts: [
      { keys: ["Enter"],           desc: { cs: "Odeslat zprávu",           en: "Send message"              } },
      { keys: ["Shift", "Enter"],  desc: { cs: "Nový řádek",               en: "New line"                  } },
      { keys: ["↑", "↓"],         desc: { cs: "Procházet návrhy @mention", en: "Navigate @mention results" } },
      { keys: ["Tab"],             desc: { cs: "Vybrat @mention",           en: "Select @mention concept"   } },
      { keys: ["Esc"],             desc: { cs: "Zavřít nabídku / dialog",   en: "Close menu / dialog"       } },
    ],
  },
  {
    title: { cs: "Recenze karet",  en: "Flashcard review" },
    shortcuts: [
      { keys: ["Space"],           desc: { cs: "Otočit kartičku",           en: "Flip card"                 } },
      { keys: ["1"],               desc: { cs: "Těžké — znovu brzy",        en: "Hard — review soon"        } },
      { keys: ["2"],               desc: { cs: "Dobré — standardní interval", en: "Good — standard interval" } },
      { keys: ["3"],               desc: { cs: "Lehké — delší interval",    en: "Easy — longer interval"    } },
    ],
  },
  {
    title: { cs: "Globální",       en: "Global" },
    shortcuts: [
      { keys: ["⌘", "K"],         desc: { cs: "Otevřít příkazovou paletu", en: "Open command palette"      } },
      { keys: ["?"],               desc: { cs: "Zkratky klávesnice",        en: "Keyboard shortcuts"        } },
      { keys: ["N"],               desc: { cs: "Přepnout panel poznámek",   en: "Toggle notes panel"        } },
    ],
  },
  {
    title: { cs: "Akce zpráv",     en: "Message actions" },
    shortcuts: [
      { keys: ["Hover"],           desc: { cs: "Zobrazit akce zprávy",      en: "Reveal message actions"    } },
    ],
  },
];

const t = <T extends object>(obj: T, locale = "en", key: "cs" | "en" = locale as "cs" | "en"): string =>
  (obj as Record<string, string>)[key] ?? (obj as Record<string, string>)["en"];

export function KeyboardShortcutsHelp({ onClose, locale = "en" }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-elevated shadow-elevation-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h2 className="text-body-md font-semibold text-content-primary">
              {locale === "cs" ? "Klávesové zkratky" : "Keyboard shortcuts"}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group.title.en} className="space-y-2">
              <h3 className="text-caption-xs font-semibold uppercase tracking-widest text-content-tertiary">
                {t(group.title, locale)}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((sc, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-body-sm text-content-secondary">{t(sc.desc, locale)}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {sc.keys.map((k) => (
                        <kbd
                          key={k}
                          className={cn(
                            "inline-flex items-center justify-center rounded border border-border-strong bg-surface-sunken px-1.5 py-0.5",
                            "text-[11px] font-mono font-medium text-content-secondary shadow-sm",
                            k === "Hover" && "border-dashed",
                          )}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border-subtle px-5 py-3">
          <p className="text-center text-caption-xs text-content-tertiary/60">
            Press <kbd className="rounded border border-border-subtle bg-surface-sunken px-1 py-0.5 text-[10px] font-mono">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}

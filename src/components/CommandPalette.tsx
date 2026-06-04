/**
 * CommandPalette — app-wide quick-search and navigation overlay.
 *
 * Triggered by Cmd+K / Ctrl+K from anywhere in the app.
 * Sections:
 *  1. Quick actions (new chat, go to map, etc.)
 *  2. AI Map concepts — fuzzy search across 75+ nodes
 *  3. Recent conversations — from conversation history
 *
 * Navigation on selection: react-router navigate.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Brain,
  Clock,
  GraduationCap,
  Map,
  MessageSquare,
  Plus,
  Search,
  Tag,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_NODES, pickLocaleText } from "@/lib/aiMapData";
import { listConversations } from "@/services/conversationHistory";
import { getStudiedConceptIds } from "@/services/learningProgress";
import type { ConversationMeta } from "@/services/conversationHistory";
import type { ConceptNode } from "@/lib/aiMapData";

/* ─── Fuzzy search ─────────────────────────────────────────────────────── */

function score(label: string, query: string): number {
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  if (l === q) return 100;
  if (l.startsWith(q)) return 80;
  if (l.includes(` ${q}`)) return 60;
  if (l.includes(q)) return 40;
  // character subsequence
  let qi = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) qi++;
  }
  return qi === q.length ? 20 : 0;
}

function searchConcepts(query: string, locale: string, limit = 8): ConceptNode[] {
  if (!query.trim()) return [];
  const results: Array<{ node: ConceptNode; sc: number }> = [];
  for (const node of ALL_NODES) {
    if (node.id === "ai-root") continue;
    const label = pickLocaleText(node.label, locale as "cs" | "en");
    const tagline = pickLocaleText(node.tagline, locale as "cs" | "en");
    const sc = Math.max(score(label, query), score(tagline, query) * 0.6);
    if (sc > 0) results.push({ node, sc });
  }
  return results
    .sort((a, b) => b.sc - a.sc)
    .slice(0, limit)
    .map((r) => r.node);
}

function searchHistory(query: string, limit = 5): ConversationMeta[] {
  const all = listConversations();
  if (!query.trim()) return all.slice(0, limit);
  const q = query.toLowerCase();
  return all
    .filter(
      (c) =>
        c.preview.toLowerCase().includes(q) ||
        (c.conceptLabel ?? "").toLowerCase().includes(q),
    )
    .slice(0, limit);
}

/* ─── Types ────────────────────────────────────────────────────────────── */

interface ResultItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

interface Props {
  onClose: () => void;
  locale?: string;
}

const L = {
  placeholder: { cs: "Hledej koncept, konverzaci nebo akci…", en: "Search concepts, history, actions…" },
  quickActions: { cs: "Rychlé akce", en: "Quick actions" },
  concepts: { cs: "AI mapa — koncepty", en: "AI Map concepts" },
  history: { cs: "Nedávné konverzace", en: "Recent conversations" },
  newChat: { cs: "Nová konverzace", en: "New conversation" },
  openMap: { cs: "Otevřít AI mapu", en: "Open AI Map" },
  openLearn: { cs: "Procházet učení", en: "Browse learning" },
  openLibrary: { cs: "Knihovna zdrojů", en: "Resource library" },
  noResults: { cs: "Žádné výsledky", en: "No results found" },
  hint: { cs: "↑↓ Pohyb  ↵ Otevřít  Esc Zavřít", en: "↑↓ Navigate  ↵ Open  Esc Close" },
  studied: { cs: "Studováno", en: "Studied" },
};
const t = (k: keyof typeof L, locale = "en") =>
  L[k][locale as "cs" | "en"] ?? L[k]["en"];

export function CommandPalette({ onClose, locale = "en" }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const studied = useMemo(() => getStudiedConceptIds(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  const backdropRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  const quickActions: ResultItem[] = useMemo(
    () => [
      {
        id: "new-chat",
        label: t("newChat", locale),
        icon: <Plus className="h-4 w-4" />,
        action: () => go("/tutor"),
      },
      {
        id: "map",
        label: t("openMap", locale),
        icon: <Map className="h-4 w-4" />,
        action: () => go("/map"),
      },
      {
        id: "learn",
        label: t("openLearn", locale),
        icon: <BookOpen className="h-4 w-4" />,
        action: () => go("/learn"),
      },
      {
        id: "library",
        label: t("openLibrary", locale),
        icon: <GraduationCap className="h-4 w-4" />,
        action: () => go("/library"),
      },
    ],
    [locale, go],
  );

  const matchedConcepts = useMemo(
    () => searchConcepts(query, locale),
    [query, locale],
  );

  const matchedHistory = useMemo(
    () => searchHistory(query),
    [query],
  );

  // Build flat result list for keyboard nav
  const sections: Array<{ title: string; items: ResultItem[] }> = useMemo(() => {
    const out: Array<{ title: string; items: ResultItem[] }> = [];

    // Show quick actions only when no query, or if query matches action labels
    const filteredActions = query.trim()
      ? quickActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
      : quickActions;
    if (filteredActions.length > 0) {
      out.push({ title: t("quickActions", locale), items: filteredActions });
    }

    if (matchedConcepts.length > 0) {
      out.push({
        title: t("concepts", locale),
        items: matchedConcepts.map((node) => ({
          id: `concept-${node.id}`,
          label: pickLocaleText(node.label, locale as "cs" | "en"),
          sub: pickLocaleText(node.tagline, locale as "cs" | "en"),
          icon: <Brain className="h-4 w-4 text-primary/70" />,
          badge: studied.has(node.id) ? t("studied", locale) : undefined,
          action: () => go(`/tutor?conceptId=${encodeURIComponent(node.id)}`),
        })),
      });
    }

    if (matchedHistory.length > 0) {
      out.push({
        title: t("history", locale),
        items: matchedHistory.map((conv) => ({
          id: `conv-${conv.id}`,
          label: conv.preview || (conv.conceptLabel ? `— ${conv.conceptLabel}` : "General"),
          sub: conv.conceptLabel,
          icon: <Clock className="h-4 w-4 text-content-tertiary" />,
          action: () => go(`/tutor?resume=${conv.id}`),
        })),
      });
    }

    return out;
  }, [query, locale, quickActions, matchedConcepts, matchedHistory, studied, go]);

  const allItems = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections],
  );

  // Clamp selected index
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, allItems.length - 1)));
  }, [allItems.length]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        allItems[selected]?.action();
      }
    },
    [allItems, selected, onClose],
  );

  let flatIdx = 0;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border-subtle bg-surface-elevated shadow-elevation-lg overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-content-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder", locale)}
            className="flex-1 bg-transparent text-body-md text-content-primary placeholder:text-content-tertiary outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setSelected(0); inputRef.current?.focus(); }}
              className="text-caption-xs text-content-tertiary hover:text-content-secondary px-1.5 py-0.5 rounded border border-border-subtle"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <MessageSquare className="h-6 w-6 text-content-tertiary/30" />
              <p className="text-body-sm text-content-tertiary">{t("noResults", locale)}</p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.title} className="mb-1">
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary/60">
                    {section.title}
                  </span>
                </div>
                {section.items.map((item) => {
                  const idx = flatIdx++;
                  const isSelected = idx === selected;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-idx={idx}
                      onClick={item.action}
                      onMouseEnter={() => setSelected(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isSelected ? "bg-surface-hover" : "hover:bg-surface-hover",
                      )}
                    >
                      <span className={cn("shrink-0", isSelected ? "text-primary" : "text-content-tertiary")}>
                        {item.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-body-sm font-medium text-content-primary truncate">
                          {item.label}
                        </span>
                        {item.sub && (
                          <span className="block text-caption-xs text-content-tertiary truncate mt-0.5">
                            {item.sub}
                          </span>
                        )}
                      </span>
                      {item.badge && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                          <Zap className="h-2.5 w-2.5" />
                          {item.badge}
                        </span>
                      )}
                      {isSelected && (
                        <span className="shrink-0 rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-content-tertiary">
                          ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border-subtle px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-content-tertiary/60">{t("hint", locale)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tag className="h-3 w-3 text-content-tertiary/40" />
            <span className="text-[10px] text-content-tertiary/40">
              {studied.size} {locale === "cs" ? "studovaných konceptů" : "concepts studied"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ConversationHistorySidebar — left panel showing past tutor sessions.
 *
 * Renders a list of conversation entries sorted by recency.
 * Allows resuming or deleting individual conversations.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, MessageSquare, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listConversations,
  deleteConversation,
  clearAllConversations,
  type ConversationMeta,
} from "@/services/conversationHistory";

interface Props {
  /** Currently active conversation ID (highlighted) */
  activeId?: string;
  onSelect: (conv: ConversationMeta) => void;
  onNew: () => void;
  locale?: "cs" | "en";
}

const L = {
  title: { cs: "Historie", en: "History" },
  newChat: { cs: "Nová konverzace", en: "New chat" },
  empty: { cs: "Žádné předchozí konverzace.", en: "No past conversations yet." },
  emptyHint: { cs: "Zeptej se AI tutora na cokoliv.", en: "Ask the AI Tutor anything to get started." },
  clearAll: { cs: "Smazat vše", en: "Clear all" },
  messages: { cs: "zpráv", en: "msgs" },
  noTopic: { cs: "Obecná konverzace", en: "General" },
  search: { cs: "Hledat…", en: "Search…" },
  noResults: { cs: "Žádné výsledky", en: "No results" },
};
const t = (k: keyof typeof L, locale = "en") =>
  L[k][locale as "cs" | "en"] ?? L[k]["en"];

function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() =>
    formatDistanceToNow(new Date(iso), { addSuffix: true }),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setLabel(formatDistanceToNow(new Date(iso), { addSuffix: true }));
    }, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return <span>{label}</span>;
}

export function ConversationHistorySidebar({ activeId, onSelect, onNew, locale = "en" }: Props) {
  const [convs, setConvs] = useState<ConversationMeta[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [query, setQuery] = useState("");

  const refresh = useCallback(() => setConvs(listConversations()), []);

  useEffect(() => {
    refresh();
    // Re-read when window regains focus (other tabs may have updated)
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  // Refresh when activeId changes (new conversation started)
  useEffect(() => { refresh(); }, [activeId, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter((c) =>
      (c.conceptLabel ?? "").toLowerCase().includes(q) ||
      (c.preview ?? "").toLowerCase().includes(q) ||
      (c.domain ?? "").toLowerCase().includes(q),
    );
  }, [convs, query]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteConversation(id);
      refresh();
    },
    [refresh],
  );

  const handleClearAll = useCallback(() => {
    if (!confirmClearAll) { setConfirmClearAll(true); return; }
    clearAllConversations();
    refresh();
    setConfirmClearAll(false);
    onNew();
  }, [confirmClearAll, refresh, onNew]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-1.5 text-content-secondary">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-body-sm font-medium">{t("title", locale)}</span>
        </div>
        <button
          type="button"
          onClick={onNew}
          title={t("newChat", locale)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-caption-xs text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-secondary"
        >
          <Plus className="h-3 w-3" />
          {t("newChat", locale)}
        </button>
      </div>

      {/* Search */}
      {convs.length > 3 && (
        <div className="px-2 py-1.5 border-b border-border-subtle/50 shrink-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-content-tertiary/60" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search", locale)}
              className="w-full rounded-lg border border-border-subtle bg-surface-base py-1.5 pl-7 pr-7 text-caption-xs text-content-primary placeholder:text-content-tertiary/60 outline-none focus:border-primary/50 transition-colors"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary/60 hover:text-content-secondary">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {convs.length === 0 ? (
          <div className="px-3 py-8 text-center space-y-1">
            <MessageSquare className="mx-auto h-6 w-6 text-content-tertiary/50" />
            <p className="text-caption-xs text-content-tertiary">{t("empty", locale)}</p>
            <p className="text-caption-xs text-content-tertiary/60">{t("emptyHint", locale)}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-caption-xs text-content-tertiary">{t("noResults", locale)}</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv)}
              className={cn(
                "group w-full rounded-lg mx-1.5 px-3 py-2 text-left transition-colors",
                "hover:bg-surface-hover",
                activeId === conv.id
                  ? "bg-surface-hover ring-1 ring-inset ring-primary/20"
                  : "bg-transparent",
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="line-clamp-2 text-caption-xs text-content-primary leading-relaxed flex-1 min-w-0">
                  {conv.preview || (conv.conceptLabel ? `— ${conv.conceptLabel}` : t("noTopic", locale))}
                </p>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, conv.id)}
                  title="Delete"
                  className={cn(
                    "shrink-0 rounded p-0.5 text-content-tertiary opacity-0 transition-all",
                    "group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive",
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {conv.conceptLabel && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-primary/70">
                    <Tag className="h-2.5 w-2.5" />
                    {conv.conceptLabel}
                  </span>
                )}
                <span className="text-[10px] text-content-tertiary/60">
                  <RelativeTime iso={conv.updatedAt} />
                </span>
                <span className="text-[10px] text-content-tertiary/40">
                  {conv.messageCount} {t("messages", locale)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {convs.length > 0 && (
        <div className="shrink-0 border-t border-border-subtle px-3 py-2">
          <button
            type="button"
            onClick={handleClearAll}
            className={cn(
              "w-full rounded-lg px-3 py-1.5 text-caption-xs transition-colors",
              confirmClearAll
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "text-content-tertiary hover:bg-surface-hover hover:text-content-secondary",
            )}
          >
            {confirmClearAll
              ? locale === "cs" ? "Opravdu smazat vše?" : "Sure? Click again"
              : t("clearAll", locale)}
          </button>
        </div>
      )}
    </div>
  );
}

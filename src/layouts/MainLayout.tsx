import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { AchievementToast } from "@/components/AchievementToast";
import { ChatWidget } from "@/components/ChatWidget";
import { useLocaleStore, selectLocale } from "@/stores/localeStore";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { getAllProgress, masteryLevel } from "@/services/learningProgress";
import { listConversations } from "@/services/conversationHistory";
import { listCards } from "@/services/flashcards";
import { listNoteIds } from "@/services/conceptNotes";
import { getStreak } from "@/services/streak";

function buildStats() {
  const progress   = getAllProgress();
  const streak     = getStreak();
  const cards      = listCards();
  const convs      = listConversations();
  const noteIds    = listNoteIds();

  return {
    totalMessages:      progress.reduce((s, p) => s + p.messageCount, 0),
    conceptsStudied:    progress.length,
    conceptsMastered:   progress.filter((p) => masteryLevel(p) === 3).length,
    flashcardCount:     cards.length,
    flashcardsReviewed: cards.filter((c) => c.repetitions > 0).length,
    noteCount:          noteIds.length,
    currentStreak:      streak?.currentStreak ?? 0,
    longestStreak:      streak?.longestStreak ?? 0,
    conversationCount:  convs.length,
    usedFeynman:        false, // updated via event
    usedQuiz:           false,
    usedVoice:          false,
  };
}

export default function MainLayout() {
  const locale = useLocaleStore(selectLocale);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { toastQueue, triggerCheck, dismiss } = useAchievementChecker();

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Check achievements on mount and when custom events fire
  useEffect(() => {
    triggerCheck(buildStats());

    function onAchievementCheck(e: Event) {
      const extra = (e as CustomEvent).detail ?? {};
      triggerCheck({ ...buildStats(), ...extra });
    }
    window.addEventListener("tutor:achievement-check", onAchievementCheck);
    return () => window.removeEventListener("tutor:achievement-check", onAchievementCheck);
  }, [triggerCheck]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar onOpenPalette={openPalette} />
      <main className="flex-1 min-w-0 h-screen flex flex-col py-2 pr-2">
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-elevation-sm">
          <div className="h-full w-full overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 animate-fade-in">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {paletteOpen && <CommandPalette locale={locale} onClose={closePalette} />}
      <AchievementToast queue={toastQueue} onDismiss={dismiss} locale={locale} />
      <ChatWidget />
    </div>
  );
}

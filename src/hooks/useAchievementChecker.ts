/**
 * useAchievementChecker — checks for newly unlocked achievements and
 * returns a queue of toasts to display.
 *
 * Call `triggerCheck(stats)` after any significant user action.
 * The hook manages the toast queue and dismissal.
 */
import { useCallback, useState } from "react";
import {
  checkAchievements,
  type Achievement,
  type AchievementStats,
} from "@/services/achievements";

interface ToastItem {
  achievement: Achievement;
  id: string;
}

let _counter = 0;

export function useAchievementChecker() {
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);

  const triggerCheck = useCallback((stats: AchievementStats) => {
    const newOnes = checkAchievements(stats);
    if (newOnes.length === 0) return;

    setToastQueue((prev) => [
      ...prev,
      ...newOnes.map((a) => ({
        achievement: a,
        id: `toast-${++_counter}`,
      })),
    ]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toastQueue, triggerCheck, dismiss };
}

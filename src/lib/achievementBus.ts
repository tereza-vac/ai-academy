/**
 * achievementBus — thin wrapper to fire a custom DOM event that triggers
 * the global achievement checker in MainLayout without prop-drilling.
 *
 * Usage:
 *   triggerAchievementCheck({ usedFeynman: true })
 */

export function triggerAchievementCheck(extra: Record<string, unknown> = {}): void {
  window.dispatchEvent(
    new CustomEvent("tutor:achievement-check", { detail: extra }),
  );
}

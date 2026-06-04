/**
 * Tutor navigation helpers.
 *
 * The AI Tutor now lives exclusively on the full `/tutor` page (the floating
 * chat widget was removed). "Ask AI about this" buttons across the app use
 * `openChatWithConcept` to jump to that page with the relevant concept
 * pre-loaded via query params.
 */
import { router } from "@/router";
import type { TutorContext } from "@/services/tutorApi";

/** Open the full AI Tutor page pre-loaded with a concept context. */
export function openChatWithConcept(context: Partial<TutorContext>) {
  const params = new URLSearchParams();
  if (context.conceptId) params.set("conceptId", context.conceptId);
  if (context.domain) params.set("domain", context.domain);
  const qs = params.toString();
  void router.navigate(qs ? `/tutor?${qs}` : "/tutor");
}

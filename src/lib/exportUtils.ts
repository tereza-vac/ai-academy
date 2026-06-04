/**
 * exportUtils — download helpers for flashcards and conversations.
 *
 * Supports:
 *   - Flashcards → CSV (importable into Anki, Quizlet, etc.)
 *   - Flashcards → Tab-separated (.txt) for Anki auto-detection
 *   - Conversations → Markdown (.md)
 */

import type { Flashcard } from "@/services/flashcards";
import type { TutorMessage } from "@/services/tutorApi";

/* ─── File download helper ───────────────────────────────────────────────── */

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ─── Flashcard → CSV ────────────────────────────────────────────────────── */

function escapeCSV(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportFlashcardsCSV(cards: Flashcard[], filename = "flashcards.csv"): void {
  const header = "Front,Back,Concept,Interval,Repetitions,EaseFactor,DueDate";
  const rows = cards.map((c) => [
    escapeCSV(c.front),
    escapeCSV(c.back),
    escapeCSV(c.conceptLabel ?? c.conceptId ?? ""),
    String(c.interval),
    String(c.repetitions),
    c.easeFactor.toFixed(2),
    c.dueDate.slice(0, 10),
  ].join(","));
  download([header, ...rows].join("\n"), filename, "text/csv;charset=utf-8;");
}

/* ─── Flashcard → Anki tab-separated ────────────────────────────────────── */

/**
 * Anki's default import format is tab-separated, one card per line.
 * Front [tab] Back [tab] Tags
 */
export function exportFlashcardsAnki(cards: Flashcard[], filename = "flashcards-anki.txt"): void {
  const rows = cards.map((c) => {
    const tag = (c.conceptId ?? "").replace(/\s+/g, "_");
    return [c.front, c.back, tag].join("\t");
  });
  download(rows.join("\n"), filename, "text/plain;charset=utf-8;");
}

/* ─── Conversation → Markdown ────────────────────────────────────────────── */

export interface ConversationExportOptions {
  title?: string;
  conceptLabel?: string;
  messages: TutorMessage[];
  filename?: string;
}

export function exportConversationMarkdown({
  title,
  conceptLabel,
  messages,
  filename = "conversation.md",
}: ConversationExportOptions): void {
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  const lines: string[] = [
    `# ${title ?? "AI Tutor Conversation"}`,
    "",
    `**Date**: ${date}`,
    ...(conceptLabel ? [`**Topic**: ${conceptLabel}`] : []),
    "",
    "---",
    "",
  ];

  for (const msg of messages) {
    const who = msg.role === "user" ? "**You**" : "**AI Tutor**";
    lines.push(`### ${who}`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  download(lines.join("\n"), filename, "text/markdown;charset=utf-8;");
}

/* ─── Study plan → Markdown ──────────────────────────────────────────────── */

import type { StudyPlan } from "@/services/studyPlan";

export function exportStudyPlanMarkdown(plan: StudyPlan, filename?: string): void {
  const file = filename ?? `study-plan-${plan.id}.md`;
  const date = new Date(plan.generatedAt).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  const lines = [
    `# Study Plan: ${plan.goal}`,
    "",
    `**Generated**: ${date}`,
    `**Background**: ${plan.background}`,
    `**Schedule**: ${plan.daysPerWeek} days/week × ${plan.weeksTotal} week(s)`,
    "",
    "---",
    "",
    plan.content,
  ];

  download(lines.join("\n"), file, "text/markdown;charset=utf-8;");
}

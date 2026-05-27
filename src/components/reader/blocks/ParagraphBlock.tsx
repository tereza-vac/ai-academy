import { Fragment, type ReactNode } from "react";
import type { InlineMark, ParagraphBlock as ParagraphBlockT } from "@/types/blocks";

interface Props {
  payload: ParagraphBlockT;
}

/**
 * Renders a paragraph, applying inline marks (strong/em/code/link) on top of
 * the raw text. Marks describe `[start, end)` slices of `text` and may
 * overlap; we resolve overlaps by splitting the text on every mark boundary
 * and applying the union of active marks per slice.
 */
export function ParagraphBlock({ payload }: Props) {
  const { text, marks } = payload;
  if (!marks || marks.length === 0) return <p>{text}</p>;
  return <p>{renderWithMarks(text, marks)}</p>;
}

function renderWithMarks(text: string, marks: InlineMark[]): ReactNode {
  const boundaries = new Set<number>([0, text.length]);
  for (const m of marks) {
    boundaries.add(Math.max(0, Math.min(text.length, m.start)));
    boundaries.add(Math.max(0, Math.min(text.length, m.end)));
  }
  const sorted = [...boundaries].sort((a, b) => a - b);

  const parts: ReactNode[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;
    const slice = text.slice(start, end);
    const active = marks.filter((m) => m.start <= start && m.end >= end);
    parts.push(wrapWithMarks(slice, active, `m-${i}`));
  }
  return parts;
}

function wrapWithMarks(slice: string, marks: InlineMark[], key: string): ReactNode {
  // Apply marks innermost-to-outermost. Order is stable per slice; we always
  // see strong, em, code, link in that nesting order so the DOM stays
  // predictable across renders.
  let node: ReactNode = slice;
  for (const m of marks) {
    if (m.kind === "strong") node = <strong>{node}</strong>;
    else if (m.kind === "em") node = <em>{node}</em>;
    else if (m.kind === "code") node = <code>{node}</code>;
    else if (m.kind === "link") node = (
      <a href={m.href} target="_blank" rel="noreferrer noopener">
        {node}
      </a>
    );
  }
  return <Fragment key={key}>{node}</Fragment>;
}

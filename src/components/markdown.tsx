/**
 * Tiny, dependency-free markdown renderer.
 *
 * Supports the subset we actually use in topic bodies, prompts and playbooks:
 *
 *   - # / ## / ### headings
 *   - paragraphs separated by blank lines
 *   - **bold** and `inline code`
 *   - fenced ``` code blocks ```
 *   - - bullet lists and 1. ordered lists
 *   - - [ ] / - [x] checklists (rendered, non-interactive)
 *
 * For anything richer, swap to `react-markdown`. Keep this honest about its scope.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; lang: string | null; code: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "checklist"; items: Array<{ text: string; checked: boolean }> };

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block
    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      const lang = fence[1] ?? null;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", lang, code: buf.join("\n") });
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      i++;
      continue;
    }

    // Checklist (only when ALL contiguous items are checklist-shaped)
    if (/^-\s+\[( |x|X)\]\s+/.test(line)) {
      const items: Array<{ text: string; checked: boolean }> = [];
      while (i < lines.length && /^-\s+\[( |x|X)\]\s+/.test(lines[i])) {
        const m = lines[i].match(/^-\s+\[( |x|X)\]\s+(.*)$/)!;
        items.push({ text: m[2], checked: m[1].toLowerCase() === "x" });
        i++;
      }
      blocks.push({ type: "checklist", items });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph (concatenate until blank line)
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3}\s|```|[-*]\s|\d+\.\s)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: buf.join(" ") });
  }
  return blocks;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  const esc = escapeHtml(text);
  return esc
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface-sunken px-1 py-0.5 text-[0.85em] font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-content-primary">$1</strong>');
}

interface MarkdownProps {
  source: string;
  className?: string;
}

export function Markdown({ source, className }: MarkdownProps) {
  const blocks = useMemo(() => parse(source), [source]);

  return (
    <div className={cn("space-y-4 text-body-md leading-relaxed text-content-secondary", className)}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            const sizes = {
              1: "text-heading-md mt-6",
              2: "text-heading-sm mt-5",
              3: "text-body-lg mt-4",
            } as const;
            const Tag = (`h${block.level}` as "h1" | "h2" | "h3");
            return (
              <Tag
                key={idx}
                className={cn(
                  "font-semibold tracking-tight text-content-primary",
                  sizes[block.level],
                )}
                dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
              />
            );
          }
          case "paragraph":
            return (
              <p
                key={idx}
                dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
              />
            );
          case "code":
            return (
              <pre
                key={idx}
                className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-sunken p-4 text-body-sm font-mono text-content-primary"
              >
                <code>{block.code}</code>
              </pre>
            );
          case "ul":
            return (
              <ul key={idx} className="list-disc space-y-1 pl-5 marker:text-content-tertiary">
                {block.items.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="list-decimal space-y-1 pl-5 marker:text-content-tertiary">
                {block.items.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
                ))}
              </ol>
            );
          case "checklist":
            return (
              <ul key={idx} className="space-y-1.5">
                {block.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        it.checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border-strong bg-surface-base",
                      )}
                    >
                      {it.checked ? (
                        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 8l3 3 7-7" />
                        </svg>
                      ) : null}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: renderInline(it.text) }} />
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}

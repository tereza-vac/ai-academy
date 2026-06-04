/**
 * TutorMessageContent — rich markdown renderer for chat messages.
 *
 * Renders:
 *  - Headings (h1–h3), paragraphs, bold/italic/inline code, links
 *  - Fenced code blocks with language label + one-click copy
 *  - Ordered and unordered lists (with nested first level)
 *  - Blockquotes, horizontal rules
 *  - GFM pipe tables
 *  - KaTeX math: `$inline$`, `$$display$$`, `\(inline\)`, `\[display\]`
 *  - Streaming cursor on the last rendered token of any block type
 */
import { useCallback, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { HighlightedCode } from "./HighlightedCode";
import { CodeRunner, isRunnable } from "./CodeRunner";

interface Props {
  content: string;
  isUser?: boolean;
  isStreaming?: boolean;
  className?: string;
}

/* ─── KaTeX rendering ───────────────────────────────────────────────────── */

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

/* ─── Security helpers ──────────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeHref(href: string): string {
  // Only allow http(s) and relative links
  try {
    const url = new URL(href, "https://example.com");
    return url.protocol === "http:" || url.protocol === "https:" ? href : "#";
  } catch {
    return href.startsWith("/") ? href : "#";
  }
}

/* ─── Inline formatter ─────────────────────────────────────────────────── */

/**
 * Process inline markdown+math in the given text and return an HTML string.
 * Order matters: code spans first (to protect their content), then math, then emphasis.
 */
function renderInline(text: string, isLast = false, isStreaming = false): string {
  // Step 1: extract code spans to protect them
  const codeSlots: string[] = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_m, code) => {
    const idx = codeSlots.length;
    codeSlots.push(`<code class="rounded bg-surface-sunken px-1 py-0.5 text-[0.85em] font-mono text-rose-500 dark:text-rose-400">${code}</code>`);
    return `\x00CODE${idx}\x00`;
  });

  // Step 2: inline math $...$  (not $$)
  out = out.replace(/\$(?!\$)([^$\n]+?)\$/g, (_m, tex) => {
    const decoded = tex.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return renderKatex(decoded, false);
  });

  // Step 3: \(...\) inline math
  out = out.replace(/\\\((.+?)\\\)/gs, (_m, tex) => {
    const decoded = tex.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return renderKatex(decoded, false);
  });

  // Step 4: emphasis, bold, links
  out = out
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-content-primary">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
      const safe = sanitizeHref(href.replace(/&amp;/g, "&"));
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:no-underline">${label}</a>`;
    });

  // Step 5: restore code spans
  out = out.replace(/\x00CODE(\d+)\x00/g, (_m, i) => codeSlots[Number(i)]);

  // Step 6: streaming cursor on last inline block
  if (isLast && isStreaming) {
    out += '<span class="inline-block w-0.5 h-[1.1em] bg-primary align-middle animate-pulse ml-0.5" />';
  }

  return out;
}

/* ─── Block types ───────────────────────────────────────────────────────── */

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; lang: string | null; code: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "math"; tex: string; display: true }
  | { type: "table"; headers: string[]; alignments: ("left" | "right" | "center" | null)[]; rows: string[][] }
  | { type: "hr" };

/* ─── Parser ────────────────────────────────────────────────────────────── */

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++; continue;
    }

    // Display math: $$...$$ (multi-line)
    if (line.trim().startsWith("$$")) {
      const rest = line.trim().slice(2);
      if (rest.includes("$$")) {
        // Single-line $$...$$ 
        const tex = rest.slice(0, rest.lastIndexOf("$$"));
        if (tex.trim()) blocks.push({ type: "math", tex: tex.trim(), display: true });
        i++; continue;
      }
      const buf: string[] = rest ? [rest] : [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("$$")) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing $$
      const tex = buf.join("\n").trim();
      if (tex) blocks.push({ type: "math", tex, display: true });
      continue;
    }

    // Display math: \[...\]
    if (line.trim().startsWith("\\[")) {
      const buf: string[] = [line.trim().slice(2)];
      i++;
      while (i < lines.length && !lines[i].trim().endsWith("\\]")) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        buf.push(lines[i].slice(0, lines[i].lastIndexOf("\\]")));
        i++;
      }
      const tex = buf.join("\n").trim();
      if (tex) blocks.push({ type: "math", tex, display: true });
      continue;
    }

    // Fenced code block
    const fenceMatch = line.match(/^```(\w+)?/);
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? null;
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
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) { blocks.push({ type: "h3", text: h3[1] }); i++; continue; }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) { blocks.push({ type: "h2", text: h2[1] }); i++; continue; }
    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) { blocks.push({ type: "h1", text: h1[1] }); i++; continue; }

    // GFM pipe table: starts with |
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\|[\s\-|:]+\|/.test(lines[i + 1].trim())) {
      const headerCells = line.trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
      const sepRow = lines[i + 1].trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
      const alignments = sepRow.map<"left" | "right" | "center" | null>((s) => {
        if (s.startsWith(":") && s.endsWith(":")) return "center";
        if (s.endsWith(":")) return "right";
        if (s.startsWith(":")) return "left";
        return null;
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim()));
        i++;
      }
      blocks.push({ type: "table", headers: headerCells, alignments, rows });
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", text: buf.join(" ") });
      continue;
    }

    // Unordered list (-, *, +)
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ""));
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

    // Paragraph
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3}\s|```|\$\$|\\\\[\[\(]|[-*+]\s|\d+\.\s|>\s|---+|\|)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: buf.join(" ") });
  }

  return blocks;
}

/* ─── Copy button for code blocks ─────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "absolute";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied!" : "Copy code"}
      className={cn(
        "flex items-center gap-1 rounded px-2 py-0.5 text-caption-xs transition-all",
        copied
          ? "text-success bg-success-soft"
          : "text-content-tertiary hover:text-content-primary hover:bg-surface-hover",
      )}
    >
      {copied ? (
        <><Check className="h-3 w-3" />Copied</>
      ) : (
        <><Copy className="h-3 w-3" />Copy</>
      )}
    </button>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function TutorMessageContent({ content, isUser = false, isStreaming = false, className }: Props) {
  const blocks = useMemo(() => (isUser ? null : parse(content)), [content, isUser]);

  if (isUser) {
    return (
      <div className={cn("whitespace-pre-wrap text-body-md leading-relaxed [overflow-wrap:anywhere]", className)}>
        {content}
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return isStreaming ? (
      <span className="inline-block w-0.5 h-4 bg-primary align-middle animate-pulse" />
    ) : null;
  }

  return (
    <div className={cn("space-y-3 text-body-md leading-relaxed text-content-secondary [overflow-wrap:anywhere]", className)}>
      {blocks.map((block, idx) => {
        const isLast = idx === blocks.length - 1;

        switch (block.type) {
          /* Headings */
          case "h1":
            return (
              <h1 key={idx}
                className="text-heading-md font-semibold tracking-tight text-content-primary mt-5 first:mt-0"
                dangerouslySetInnerHTML={{ __html: renderInline(block.text, isLast, isStreaming) }}
              />
            );
          case "h2":
            return (
              <h2 key={idx}
                className="text-heading-sm font-semibold tracking-tight text-content-primary mt-4 first:mt-0"
                dangerouslySetInnerHTML={{ __html: renderInline(block.text, isLast, isStreaming) }}
              />
            );
          case "h3":
            return (
              <h3 key={idx}
                className="text-body-lg font-semibold text-content-primary mt-3 first:mt-0"
                dangerouslySetInnerHTML={{ __html: renderInline(block.text, isLast, isStreaming) }}
              />
            );

          /* Paragraph */
          case "paragraph":
            return (
              <p key={idx}
                dangerouslySetInnerHTML={{ __html: renderInline(block.text, isLast, isStreaming) }}
              />
            );

          /* Code */
          case "code":
            return (
              <div key={idx} className="rounded-xl overflow-hidden border border-border-subtle">
                <div className="flex items-center justify-between bg-surface-sunken px-4 py-1.5 border-b border-border-subtle">
                  <span className="text-caption-xs font-mono text-content-tertiary uppercase tracking-wide">
                    {block.lang ?? "code"}
                  </span>
                  <div className="flex items-center gap-1">
                    <CopyButton text={block.code} />
                  </div>
                </div>
                <div className="bg-surface-sunken">
                  <HighlightedCode
                    code={block.code}
                    lang={block.lang}
                    isStreaming={isLast && isStreaming}
                  />
                </div>
                {isLast && isStreaming && (
                  <div className="bg-surface-sunken px-4 pb-2">
                    <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse" />
                  </div>
                )}
                {/* Sandboxed execution for JS/TS blocks (only after streaming) */}
                {!(isLast && isStreaming) && isRunnable(block.lang) && (
                  <CodeRunner code={block.code} lang={block.lang} />
                )}
              </div>
            );

          /* Math display block */
          case "math":
            return (
              <div
                key={idx}
                className="my-2 overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: renderKatex(block.tex, true) }}
              />
            );

          /* Lists */
          case "ul":
            return (
              <ul key={idx} className="list-disc space-y-1 pl-5 marker:text-content-tertiary">
                {block.items.map((item, j) => {
                  const isLastItem = isLast && j === block.items.length - 1;
                  return (
                    <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(item, isLastItem, isStreaming) }} />
                  );
                })}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="list-decimal space-y-1 pl-5 marker:text-content-tertiary">
                {block.items.map((item, j) => {
                  const isLastItem = isLast && j === block.items.length - 1;
                  return (
                    <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(item, isLastItem, isStreaming) }} />
                  );
                })}
              </ol>
            );

          /* GFM Table */
          case "table": {
            const alignClass = (a: "left" | "right" | "center" | null) =>
              a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
            return (
              <div key={idx} className="overflow-x-auto rounded-xl border border-border-subtle">
                <table className="min-w-full text-body-sm">
                  <thead className="bg-surface-sunken">
                    <tr>
                      {block.headers.map((h, j) => (
                        <th
                          key={j}
                          className={cn(
                            "px-4 py-2 font-semibold text-content-primary border-b border-border-subtle",
                            alignClass(block.alignments[j] ?? null),
                          )}
                          dangerouslySetInnerHTML={{ __html: renderInline(h) }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? "bg-surface-base" : "bg-surface-elevated/40"}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className={cn(
                              "px-4 py-2 text-content-secondary border-b border-border-subtle/50 last:border-0",
                              alignClass(block.alignments[ci] ?? null),
                            )}
                            dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          /* Blockquote */
          case "blockquote":
            return (
              <blockquote key={idx}
                className="border-l-2 border-primary/40 pl-4 text-content-tertiary italic"
                dangerouslySetInnerHTML={{ __html: renderInline(block.text, isLast, isStreaming) }}
              />
            );

          /* HR */
          case "hr":
            return <hr key={idx} className="border-border-subtle" />;

          default:
            return null;
        }
      })}
    </div>
  );
}

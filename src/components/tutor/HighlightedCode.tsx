/**
 * HighlightedCode — async Shiki-highlighted code block.
 *
 * Renders plain monospace during streaming (fast, no layout shift), then
 * upgrades to full syntax-highlighted HTML once the stream finishes.
 */
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { getHighlighter, normalizeLang } from "@/lib/shiki";
import { cn } from "@/lib/utils";

interface Props {
  code: string;
  lang: string | null;
  /** When true renders plain text — highlighting is deferred until false */
  isStreaming?: boolean;
  className?: string;
}

export function HighlightedCode({ code, lang, isStreaming = false, className }: Props) {
  const { resolvedTheme } = useTheme();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const prevCodeRef = useRef<string>("");
  const prevThemeRef = useRef<string>("");

  const theme = resolvedTheme === "dark" ? "github-dark" : "github-light";
  const normalizedLang = normalizeLang(lang);

  useEffect(() => {
    // Only highlight after streaming completes, and only when content/theme changes
    if (isStreaming) {
      setHighlighted(null);
      return;
    }
    if (code === prevCodeRef.current && theme === prevThemeRef.current && highlighted !== null) return;

    let cancelled = false;

    getHighlighter().then((hl) => {
      if (cancelled) return;
      try {
        const html = hl.codeToHtml(code, {
          lang: normalizedLang,
          theme,
        });
        if (!cancelled) {
          prevCodeRef.current = code;
          prevThemeRef.current = theme;
          setHighlighted(html);
        }
      } catch {
        // Unknown language — fall back to plain text
        if (!cancelled) setHighlighted(null);
      }
    });

    return () => { cancelled = true; };
  }, [code, isStreaming, theme, normalizedLang, highlighted]);

  if (highlighted && !isStreaming) {
    return (
      <div
        className={cn(
          "overflow-x-auto text-body-sm font-mono leading-relaxed [&_pre]:p-4",
          "[&_.shiki]:bg-transparent",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }

  return (
    <pre className={cn("overflow-x-auto p-4 text-body-sm font-mono leading-relaxed text-content-primary", className)}>
      <code>{code}</code>
    </pre>
  );
}

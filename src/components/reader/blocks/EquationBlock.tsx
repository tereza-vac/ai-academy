import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import type { EquationBlock as EquationBlockT } from "@/types/blocks";

interface Props {
  payload: EquationBlockT;
}

/**
 * Renders TeX into HTML via KaTeX. KaTeX-renderToString is synchronous and
 * has no DOM dependencies, so this can render server-side too (and supports
 * SSR/streaming if we add it later).
 */
export function EquationBlock({ payload }: Props) {
  const { tex, display } = payload;
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore",
        output: "htmlAndMathml",
      });
    } catch {
      // Fall back to a <pre> so the reader still shows *something* even when
      // an importer hands us malformed TeX.
      return null;
    }
  }, [tex, display]);

  if (!html) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-surface-soft p-3 font-mono text-body-sm">
        {tex}
      </pre>
    );
  }

  return (
    <div
      className={cn("katex-block", display ? "my-4 overflow-x-auto text-center" : "inline-block")}
      // KaTeX output is trusted (we control the input via importer + Zod
      // validation upstream). KaTeX itself does its own escaping.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

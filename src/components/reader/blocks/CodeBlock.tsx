import type { CodeBlock as CodeBlockT } from "@/types/blocks";

interface Props {
  payload: CodeBlockT;
}

/**
 * Code block with horizontal scroll. Syntax highlighting is intentionally
 * left out for PR-2 — we can drop in `shiki` later without changing the
 * block schema. Plain `<code>` keeps the bundle small.
 */
export function CodeBlock({ payload }: Props) {
  return (
    <pre className="my-4 overflow-x-auto rounded-lg border border-border-subtle bg-surface-soft p-4 font-mono text-body-sm">
      <code data-lang={payload.lang ?? "plain"}>{payload.text}</code>
    </pre>
  );
}

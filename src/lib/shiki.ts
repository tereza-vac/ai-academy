/**
 * Shiki highlighter singleton — initialised once, shared across all code blocks.
 *
 * Languages bundled: Python, JS/TS, JSON, Bash, SQL, Rust, Go, YAML, Markdown,
 * plus common aliases (shell, sh, zsh, tsx, jsx).
 *
 * Themes: github-dark / github-light (switch via system/user preference).
 */
import { createHighlighter, type Highlighter } from "shiki";

const LANGS = [
  "python",
  "javascript",
  "typescript",
  "tsx",
  "jsx",
  "json",
  "jsonc",
  "bash",
  "sh",
  "shell",
  "zsh",
  "sql",
  "rust",
  "go",
  "yaml",
  "toml",
  "markdown",
  "html",
  "css",
  "dockerfile",
  "diff",
  "plaintext",
  "text",
] as const;

const THEMES = ["github-dark", "github-light"] as const;

let _instance: Highlighter | null = null;
let _promise: Promise<Highlighter> | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (_instance) return _instance;
  if (_promise) return _promise;

  _promise = createHighlighter({
    themes: [...THEMES],
    langs: [...LANGS],
  }).then((hl) => {
    _instance = hl;
    return hl;
  });

  return _promise;
}

/** Convert a fenced-block language tag to the nearest Shiki language id. */
export function normalizeLang(lang: string | null | undefined): string {
  if (!lang) return "plaintext";
  const l = lang.toLowerCase().trim();
  const aliases: Record<string, string> = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    sh: "bash",
    zsh: "bash",
    shell: "bash",
    console: "bash",
    yml: "yaml",
    md: "markdown",
    txt: "plaintext",
    text: "plaintext",
  };
  return aliases[l] ?? l;
}

export type ShikiTheme = "github-dark" | "github-light";

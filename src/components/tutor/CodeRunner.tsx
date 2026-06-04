/**
 * CodeRunner — sandboxed JavaScript/TypeScript execution for tutor code blocks.
 *
 * Uses a hidden <iframe sandbox="allow-scripts"> to execute the code.
 * Console output is captured via postMessage and displayed below the block.
 * TypeScript is stripped of type annotations before execution (basic ts→js).
 *
 * Security: `allow-scripts` without `allow-same-origin` means the iframe
 * cannot access the parent's DOM, cookies, or localStorage.
 */
import { useCallback, useRef, useState } from "react";
import { Play, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LogLevel = "log" | "warn" | "error" | "info";

interface LogEntry {
  level: LogLevel;
  args: string[];
}

const RUNNABLE_LANGS = new Set(["js", "javascript", "ts", "typescript", "jsx", "tsx"]);

export function isRunnable(lang: string | null | undefined): boolean {
  return RUNNABLE_LANGS.has((lang ?? "").toLowerCase());
}

/** Very naïve TypeScript → JavaScript: strip type annotations, interfaces, and :Type */
function stripTypes(code: string): string {
  return code
    .replace(/^(import\s+type\s+[^;]+;)/gm, "// $1")   // import type
    .replace(/:\s*\w+(\[\])?(\s*\|[^,);\n]+)*/g, "")    // : SomeType
    .replace(/^(interface|type)\s+\w+[^}]*\}/gms, "")   // interface / type alias
    .replace(/^(export\s+)?(abstract\s+)?class\s+(\w+)(<[^>]+>)?/gm, "class $3")
    .replace(/<[\w,\s]+>/g, "");                          // generic <T>
}

const SANDBOX_HTML = (code: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body><script>
const __logs=[];
const __push=(l)=>e=>{ const s=[...e].map(v=>{ try{return typeof v==="object"?JSON.stringify(v,null,2):String(v)}catch{return String(v)} }); __logs.push({level:l,args:s}); parent.postMessage({type:"log",level:l,args:s},"*"); };
console.log=__push("log");console.warn=__push("warn");console.error=__push("error");console.info=__push("info");
window.onerror=(m,_s,_l,_c,e)=>{ parent.postMessage({type:"error",message:e?.message||m},"*"); return true; };
window.onunhandledrejection=e=>{ parent.postMessage({type:"error",message:e.reason?.message||String(e.reason)},"*"); };
try{
${code}
parent.postMessage({type:"done"},"*");
}catch(e){ parent.postMessage({type:"error",message:e?.message||String(e)},"*"); }
<\/script></body></html>`;

interface Props {
  code: string;
  lang: string | null;
}

export function CodeRunner({ code, lang }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const handlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  const run = useCallback(() => {
    setLogs([]);
    setError(null);
    setRunning(true);
    setRan(true);

    // Prepare code
    const lang_ = (lang ?? "").toLowerCase();
    const js = lang_ === "ts" || lang_ === "typescript" || lang_ === "tsx"
      ? stripTypes(code)
      : code;

    // Remove old iframe
    if (iframeRef.current) {
      iframeRef.current.remove();
      iframeRef.current = null;
    }
    if (handlerRef.current) {
      window.removeEventListener("message", handlerRef.current);
    }

    const timeout = setTimeout(() => {
      setRunning(false);
      setError("Execution timed out (5s).");
    }, 5000);

    const handler = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      if (e.data.type === "log") {
        setLogs((prev) => [...prev, { level: e.data.level, args: e.data.args }]);
      } else if (e.data.type === "error") {
        setError(e.data.message);
        setRunning(false);
        clearTimeout(timeout);
      } else if (e.data.type === "done") {
        setRunning(false);
        clearTimeout(timeout);
      }
    };
    handlerRef.current = handler;
    window.addEventListener("message", handler);

    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    const blob = new Blob([SANDBOX_HTML(js)], { type: "text/html" });
    iframe.src = URL.createObjectURL(blob);
  }, [code, lang]);

  const reset = useCallback(() => {
    setLogs([]);
    setError(null);
    setRunning(false);
    setRan(false);
  }, []);

  const levelStyle: Record<LogLevel, string> = {
    log: "text-content-primary",
    info: "text-blue-500",
    warn: "text-yellow-500",
    error: "text-destructive",
  };

  return (
    <div className="border-t border-border-subtle">
      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-surface-sunken px-4 py-1.5">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-caption-xs font-medium transition-colors",
            "bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          <Play className="h-3 w-3" />
          {running ? "Running…" : ran ? "Run again" : "Run"}
        </button>
        {ran && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption-xs text-content-tertiary hover:text-content-secondary transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] text-content-tertiary/50 italic">
          Sandboxed JS · console output below
        </span>
      </div>

      {/* Output */}
      {ran && (
        <div className="bg-black/[0.85] px-4 py-3 font-mono text-body-sm min-h-[40px] max-h-[200px] overflow-y-auto space-y-0.5">
          {logs.length === 0 && !error && !running && (
            <span className="text-content-tertiary/50 text-caption-xs italic">(no output)</span>
          )}
          {logs.map((entry, i) => (
            <div key={i} className={cn("whitespace-pre-wrap leading-relaxed", levelStyle[entry.level])}>
              {entry.args.join(" ")}
            </div>
          ))}
          {error && (
            <div className="flex items-start gap-1.5 text-destructive">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
          {running && (
            <span className="text-content-tertiary/50 animate-pulse text-caption-xs">Executing…</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Scrape policy for the resource-import edge function.
 *
 * We scrape a URL *only* when all three are true:
 *   1. The hostname is on the PR-reviewed allowlist below.
 *   2. The site's robots.txt allows our user agent.
 *   3. The page itself does not opt out via meta tag or HTTP header
 *      (`noai`, `noindex`, `X-Robots-Tag`).
 *
 * Anything else falls through to `metadata_only` or `excerpt_only`.
 *
 * To add a source, open a PR that adds the host below — keeping the list
 * in source makes the decision auditable. Be careful: by adding a host
 * here you are claiming the site's TOS allows our agent to fetch it.
 */

/** AI lab + research blogs that publish freely. License surfaced as 'allowlisted-blog'. */
export const DOMAIN_ALLOWLIST: ReadonlySet<string> = new Set([
  "openai.com",
  "anthropic.com",
  "deepmind.google",
  "ai.google",
  "ai.meta.com",
  "mistral.ai",
  "huggingface.co",      // blog only — checked in caller via path
  "microsoft.com",       // research subdir — checked in caller via path
  "nvidia.com",          // blog subdir — checked in caller via path
  "cohere.com",
]);

/** Paths within an allowlisted host that further must match. */
const PATH_GATES: ReadonlyArray<{ host: string; prefix: string }> = [
  { host: "huggingface.co", prefix: "/blog" },
  { host: "microsoft.com", prefix: "/en-us/research" },
  { host: "nvidia.com", prefix: "/en-us/research" },
  { host: "cohere.com", prefix: "/blog" },
];

const USER_AGENT = "AI-Academy-Reader/1.0 (+https://github.com/scio-edu/ai-academy)";

/** Returns true when the host (and path, where required) is allowlisted. */
export function isHostAllowlisted(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!DOMAIN_ALLOWLIST.has(host)) return false;
  const gate = PATH_GATES.find((g) => g.host === host);
  if (gate && !url.pathname.startsWith(gate.prefix)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// In-memory 24h cache for robots.txt + per-page meta checks. Edge functions
// are short-lived but warm calls still benefit when the same host appears
// repeatedly within a single ingest run.
// ---------------------------------------------------------------------------
const TTL_MS = 24 * 60 * 60 * 1000;
interface CacheEntry { value: boolean; expires: number; }
const robotsCache = new Map<string, CacheEntry>();
const metaCache   = new Map<string, CacheEntry>();

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/plain,text/html,*/*" },
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Robots.txt parser tuned for our agent. Returns true when fetching `url` is
 * allowed (or robots.txt is unreachable, which we treat as permissive on
 * already-allowlisted hosts).
 */
export async function robotsAllows(url: URL): Promise<boolean> {
  const key = url.origin;
  const cached = robotsCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  const txt = await fetchText(`${url.origin}/robots.txt`);
  // No robots.txt -> permissive. We only get here for allowlisted hosts.
  const allowed = txt === null ? true : evaluateRobots(txt, url.pathname);
  robotsCache.set(key, { value: allowed, expires: Date.now() + TTL_MS });
  return allowed;
}

function evaluateRobots(robotsTxt: string, path: string): boolean {
  // Minimal evaluator: we read the directives for our agent first, then fall
  // back to `*`. Allow > Disallow, longest-match wins.
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  type Rule = { allow: boolean; pattern: string };
  const groups = new Map<string, Rule[]>();
  let currentAgents: string[] = [];

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const [rawKey, ...rest] = line.split(":");
    if (rest.length === 0) continue;
    const key = rawKey.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      currentAgents = [value.toLowerCase()];
      if (!groups.has(value.toLowerCase())) groups.set(value.toLowerCase(), []);
    } else if (key === "allow" || key === "disallow") {
      for (const a of currentAgents) {
        const arr = groups.get(a) ?? [];
        arr.push({ allow: key === "allow", pattern: value });
        groups.set(a, arr);
      }
    }
  }

  const ourAgent = "ai-academy-reader";
  const rules =
    groups.get(ourAgent) ?? groups.get("*") ?? [];

  // Find the longest matching rule. Empty Disallow == allow-all.
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!r.pattern) {
      if (!r.allow) continue; // empty disallow == nothing disallowed
      best = { allow: true, len: 0 };
      continue;
    }
    if (matchesRobotsPattern(path, r.pattern)) {
      if (!best || r.pattern.length > best.len) {
        best = { allow: r.allow, len: r.pattern.length };
      }
    }
  }
  return best ? best.allow : true;
}

function matchesRobotsPattern(path: string, pattern: string): boolean {
  // Supports `*` wildcard and `$` end-of-line; simple but sufficient for the
  // patterns major sites actually publish.
  const re = "^" + escapeRegex(pattern).replace(/\\\*/g, ".*").replace(/\\\$/g, "$");
  try { return new RegExp(re).test(path); } catch { return false; }
}
function escapeRegex(s: string): string { return s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Returns true when neither the response headers nor the document meta tags
 * opt out via `noai`, `noindex`, or `X-Robots-Tag`. Caches per URL.
 */
export function metaAllowsScrape(headers: Headers, html: string): boolean {
  const key = headers.get("etag") || headers.get("last-modified") || html.slice(0, 64);
  const cached = metaCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  const xrt = (headers.get("x-robots-tag") || "").toLowerCase();
  if (/\b(noai|noindex|none)\b/.test(xrt)) {
    metaCache.set(key, { value: false, expires: Date.now() + TTL_MS });
    return false;
  }

  // Cheap regex peek so we don't pay for a full DOM parse just to check meta.
  const metaRe =
    /<meta[^>]*name=["']?(robots|googlebot|ai-content)["']?[^>]*content=["']?([^"'>]+)["']?/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    const content = m[2].toLowerCase();
    if (/\b(noai|noindex|none)\b/.test(content)) {
      metaCache.set(key, { value: false, expires: Date.now() + TTL_MS });
      return false;
    }
  }
  metaCache.set(key, { value: true, expires: Date.now() + TTL_MS });
  return true;
}

/**
 * One-shot: fetch the URL, then check meta + headers. Returns the response
 * body when scraping is allowed, null otherwise.
 */
export async function fetchIfScrapingAllowed(url: URL): Promise<{
  html: string;
  finalUrl: string;
} | null> {
  if (!isHostAllowlisted(url)) return null;
  if (!(await robotsAllows(url))) return null;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
      signal: ctl.signal,
      redirect: "follow",
    });
  } catch {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);

  if (!res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("html")) return null;
  const html = await res.text();
  if (!metaAllowsScrape(res.headers, html)) return null;
  return { html, finalUrl: res.url };
}

export const SCRAPE_USER_AGENT = USER_AGENT;

/**
 * conceptMatcher — lightweight text-search for AI Map concepts.
 *
 * Scans a block of text and returns ConceptNodes whose English or Czech label
 * appears in the text. Used to surface "Related concepts" chips after each
 * tutor response.
 *
 * Strategy:
 *  1. Lowercase + strip markdown code blocks (don't match inside `code`).
 *  2. For every node label, check for a whole-word occurrence in the text.
 *  3. Prefer longer (more specific) labels over shorter ones to reduce noise.
 *  4. Cap at `limit` results; exclude the currently active concept.
 */
import { ALL_NODES, type ConceptNode } from "@/lib/aiMapData";

/** Strip fenced code blocks and inline code spans before matching. */
function stripCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ");
}

/** Normalise for case-insensitive whole-word matching. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, " ");
}

/** Build a simple whole-word regex for a phrase (handles hyphens too). */
function wordRegex(phrase: string): RegExp {
  // Escape regex meta-chars, allow hyphens as word boundaries
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "i");
}

/**
 * Return up to `limit` ConceptNodes whose label appears in `text`.
 *
 * @param text       - Raw AI assistant response (may contain markdown)
 * @param locale     - "en" or "cs" — which label to search for
 * @param excludeId  - Skip this node (it's the active concept)
 * @param limit      - Max results to return
 */
export function matchConcepts(
  text: string,
  locale: "cs" | "en" = "en",
  excludeId?: string,
  limit = 4,
): ConceptNode[] {
  const clean = normalize(stripCode(text));

  const hits: Array<{ node: ConceptNode; labelLen: number }> = [];

  for (const node of ALL_NODES) {
    if (node.id === "ai-root") continue;
    if (excludeId && node.id === excludeId) continue;

    const label = locale === "cs" ? node.label.cs : node.label.en;
    if (!label || label.length < 3) continue;

    const pattern = wordRegex(normalize(label));
    if (pattern.test(clean)) {
      hits.push({ node, labelLen: label.length });
    }
  }

  // Longer labels = more specific = higher priority
  hits.sort((a, b) => b.labelLen - a.labelLen);

  // Deduplicate by domain: at most 2 nodes per domain to keep variety
  const seenDomains = new Map<string, number>();
  const results: ConceptNode[] = [];
  for (const { node } of hits) {
    const count = seenDomains.get(node.domain) ?? 0;
    if (count >= 2) continue;
    seenDomains.set(node.domain, count + 1);
    results.push(node);
    if (results.length >= limit) break;
  }

  return results;
}

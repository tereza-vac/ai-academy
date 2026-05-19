/**
 * Tiny RSS / Atom parser.
 *
 * Intentionally minimal so the structure is obvious. Swap for a hardened
 * library (`@rowanmanning/feed-parser`, `fast-xml-parser`, …) once we care
 * about edge cases. The current implementation handles the common-case shape
 * of RSS 2.0 + Atom 1.0 feeds we use in `rss_sources` for the MVP.
 */

export interface ParsedFeedItem {
  title: string;
  link: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  raw: Record<string, unknown>;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function extractTag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return decodeEntities(stripCdata(m[1])).trim();
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*\\/?>`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function isoOrNull(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export function parseFeed(xml: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];
  const isAtom = /<feed[\s>][\s\S]*<\/feed>/i.test(xml);
  const entryTag = isAtom ? "entry" : "item";
  const entryRegex = new RegExp(`<${entryTag}\\b[^>]*>([\\s\\S]*?)<\\/${entryTag}>`, "gi");

  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    if (!title) continue;

    let link: string | null = null;
    if (isAtom) {
      link = extractAttr(block, "link", "href");
    } else {
      link = extractTag(block, "link");
    }
    if (!link) continue;

    const description =
      extractTag(block, "description") ??
      extractTag(block, "summary") ??
      extractTag(block, "content") ??
      extractTag(block, "content:encoded");

    const author =
      extractTag(block, "dc:creator") ??
      extractTag(block, "author") ??
      null;

    const published =
      extractTag(block, "pubDate") ??
      extractTag(block, "published") ??
      extractTag(block, "updated") ??
      null;

    items.push({
      title: stripHtml(title),
      link: link.trim(),
      summary: description ? stripHtml(description).slice(0, 600) : null,
      author: author ? stripHtml(author) : null,
      publishedAt: isoOrNull(published),
      raw: { rawBlock: block },
    });
  }

  return items;
}

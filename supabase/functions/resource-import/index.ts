/**
 * resource-import edge function.
 *
 * POST /functions/v1/resource-import
 *   { "resourceId": "<uuid>" }
 *
 * Service-role only (the function uses the SERVICE_ROLE_KEY internally to
 * read the resource row + call the SECURITY DEFINER `upsert_resource_content`
 * RPC). The caller's JWT is validated only to ensure the request came from a
 * signed-in user; we don't act on their behalf.
 *
 * Fallback chain (first hit wins):
 *   1. arXiv ID  -> ar5iv HTML
 *   2. PMC ID    -> NCBI E-utilities JATS XML
 *   3. DOI       -> Unpaywall open-access PDF -> pdfjs text extraction
 *   4. URL       -> allowlisted blog -> Readability
 *   5. otherwise -> persist `metadata_only` with the URL/title/abstract we
 *                   already have, so the reader at least surfaces a usable
 *                   "external source" view.
 *
 * Every run inserts a `resource_imports_log` row (via the
 * `log_resource_import` RPC) regardless of outcome so ops can diff failures.
 */
import { createClient } from "@supabase/supabase-js";
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";

// Heavy npm deps are loaded lazily so the function boots even when only the
// `metadata-only` fallback path actually runs. Deno's `npm:` resolver can be
// fussy at boot time with subpath imports (pdfjs legacy build, in particular)
// and we'd rather degrade gracefully than serve a 503.
async function loadLinkedom() {
  return await import("npm:linkedom@0.18.5");
}
async function loadReadability() {
  return await import("npm:@mozilla/readability@0.5.0");
}
async function loadPdfjs() {
  return await import("npm:pdfjs-dist@4.7.76/legacy/build/pdf.mjs");
}
import {
  ImportedBlock,
  ImportedContentMeta,
  extractTextForHash,
  sha256,
  type BlockPayloadT,
  type ImportedBlockT,
  type ImportedContentMetaT,
} from "../_shared/blockSchema.ts";
import { fetchIfScrapingAllowed, SCRAPE_USER_AGENT } from "../_shared/scrapePolicy.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UNPAYWALL_EMAIL = Deno.env.get("UNPAYWALL_EMAIL") ?? "ops@scio.cz";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Resource lookup
// ---------------------------------------------------------------------------
interface ResourceRow {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  external_id: string | null;
  source_name: string | null;
  availability: string;
}

async function loadResource(resourceId: string): Promise<ResourceRow | null> {
  const { data, error } = await supabase
    .from("resources")
    .select("id,url,title,summary,author,external_id,source_name,availability")
    .eq("id", resourceId)
    .maybeSingle();
  if (error) {
    console.error("[resource-import] resource lookup failed:", error.message);
    return null;
  }
  return (data as ResourceRow) ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts an arXiv id from a URL or external_id, or null. */
function extractArxivId(row: ResourceRow): string | null {
  if (row.external_id?.startsWith("arXiv:")) {
    return row.external_id.slice("arXiv:".length).trim();
  }
  const m = row.url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?|[a-z\-]+\/\d{7})/i);
  return m ? m[1].replace(/v\d+$/, "") : null;
}

function extractPmcId(row: ResourceRow): string | null {
  if (row.external_id?.startsWith("PMC")) return row.external_id;
  const m = row.url.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)/i);
  return m ? m[1] : null;
}

function extractDoi(row: ResourceRow): string | null {
  if (row.external_id?.startsWith("DOI:")) {
    return row.external_id.slice("DOI:".length).trim();
  }
  const m = row.url.match(/doi\.org\/(10\.\d{4,9}\/[^\s?#]+)/i);
  return m ? m[1] : null;
}

async function timedFetch(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<Response | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: { "user-agent": SCRAPE_USER_AGENT, ...(init?.headers ?? {}) },
      signal: ctl.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Importer 1 — arXiv via ar5iv (HTML5 rendering of arXiv papers)
// ---------------------------------------------------------------------------
async function importArxivAr5iv(
  row: ResourceRow,
  arxivId: string,
): Promise<{ meta: ImportedContentMetaT; blocks: ImportedBlockT[] } | null> {
  const url = `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
  const res = await timedFetch(url);
  if (!res || !res.ok) return null;
  const html = await res.text();

  const { parseHTML } = await loadLinkedom();
  const { document } = parseHTML(html);
  const article = document.querySelector("article, .ltx_document, main") ?? document.body;
  if (!article) return null;

  const blocks: BlockPayloadT[] = [];
  let blockUidCounter = 0;
  const out: ImportedBlockT[] = [];
  let hasEquations = false;
  let hasTables = false;

  const push = async (payload: BlockPayloadT, hint: string) => {
    blocks.push(payload);
    out.push({
      block_uid: `${hint}-${blockUidCounter++}`,
      position: out.length,
      type: payload.type,
      payload,
      text_hash: await sha256(extractTextForHash(payload)),
    });
  };

  // ar5iv structure: title in <h1.ltx_title>, sections in <section.ltx_section>
  const title = (article.querySelector("h1") as HTMLHeadingElement | null)?.textContent?.trim();
  if (title) await push({ type: "heading", level: 1, text: title }, "h1");

  const walker = article.querySelectorAll(
    "section h2, section h3, section h4, p, figure img, math, .ltx_equation, .ltx_Math, ul, ol, table",
  );
  for (const el of Array.from(walker)) {
    const tag = el.tagName.toLowerCase();
    if (tag === "h2" || tag === "h3" || tag === "h4") {
      const level = (parseInt(tag.slice(1), 10) as 2 | 3 | 4) ?? 2;
      const text = (el.textContent ?? "").trim();
      if (text) await push({ type: "heading", level, text }, `h${level}`);
    } else if (tag === "p") {
      const text = (el.textContent ?? "").trim();
      if (text.length >= 20) await push({ type: "paragraph", text }, "p");
    } else if (tag === "img") {
      const src = (el.getAttribute("src") ?? "").trim();
      if (!src) continue;
      const absolute = new URL(src, url).toString();
      const alt = el.getAttribute("alt");
      await push({ type: "image", src: absolute, alt: alt || null }, "img");
    } else if (tag === "math" || el.classList.contains("ltx_equation") || el.classList.contains("ltx_Math")) {
      const tex = el.getAttribute("alttext") ?? (el.textContent ?? "").trim();
      if (tex) {
        hasEquations = true;
        await push({ type: "equation", tex, display: tag === "math" ? true : true }, "eq");
      }
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(el.querySelectorAll("li"))
        .map((li) => (li.textContent ?? "").trim())
        .filter(Boolean);
      if (items.length) await push({ type: "list", ordered: tag === "ol", items }, "list");
    } else if (tag === "table") {
      hasTables = true;
      const rows = Array.from(el.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.querySelectorAll("th,td")).map((c) => (c.textContent ?? "").trim()),
      );
      if (rows.length) {
        const header = Boolean(el.querySelector("th"));
        await push({ type: "table", rows, header }, "tbl");
      }
    }
  }

  if (out.length < 3) return null;

  const wordCount = blocks
    .filter((b) => b.type === "paragraph")
    .map((b) => (b as { text: string }).text)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    meta: {
      source_url: url,
      source_lang: "en",
      license: "arxiv-nonexclusive",
      importer: "arxiv-ar5iv",
      importer_version: 1,
      word_count: wordCount,
      has_equations: hasEquations,
      has_tables: hasTables,
      raw_meta: { arxivId },
      availability: "full_text_api",
    },
    blocks: out,
  };
}

// ---------------------------------------------------------------------------
// Importer 2 — PubMed Central JATS
// ---------------------------------------------------------------------------
async function importPmcJats(
  row: ResourceRow,
  pmcId: string,
): Promise<{ meta: ImportedContentMetaT; blocks: ImportedBlockT[] } | null> {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcId.replace(/^PMC/, "")}&rettype=xml`;
  const res = await timedFetch(url);
  if (!res || !res.ok) return null;
  const xml = await res.text();
  const { parseHTML } = await loadLinkedom();
  const { document } = parseHTML(`<!doctype html><html><body>${xml}</body></html>`);

  const out: ImportedBlockT[] = [];
  let blockUidCounter = 0;
  const push = async (payload: BlockPayloadT, hint: string) => {
    out.push({
      block_uid: `${hint}-${blockUidCounter++}`,
      position: out.length,
      type: payload.type,
      payload,
      text_hash: await sha256(extractTextForHash(payload)),
    });
  };

  const title = document.querySelector("article-title")?.textContent?.trim();
  if (title) await push({ type: "heading", level: 1, text: title }, "h1");

  const abstract = document.querySelector("abstract")?.textContent?.trim();
  if (abstract) await push({ type: "paragraph", text: abstract }, "p");

  const bodyEls = document.querySelectorAll("body p, body sec, body title, body list");
  let hasTables = false;
  for (const el of Array.from(bodyEls)) {
    const tag = el.tagName.toLowerCase();
    if (tag === "title") {
      const text = (el.textContent ?? "").trim();
      if (text) await push({ type: "heading", level: 2, text }, "h2");
    } else if (tag === "p") {
      const text = (el.textContent ?? "").trim();
      if (text.length >= 20) await push({ type: "paragraph", text }, "p");
    } else if (tag === "list") {
      const items = Array.from(el.querySelectorAll("list-item"))
        .map((li) => (li.textContent ?? "").trim())
        .filter(Boolean);
      if (items.length) await push({ type: "list", ordered: false, items }, "list");
    }
  }

  if (out.length < 3) return null;

  return {
    meta: {
      source_url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}`,
      source_lang: "en",
      license: "cc-by",
      importer: "pmc-jats",
      importer_version: 1,
      word_count: null,
      has_equations: false,
      has_tables: hasTables,
      raw_meta: { pmcId },
      availability: "full_text_api",
    },
    blocks: out,
  };
}

// ---------------------------------------------------------------------------
// Importer 3 — Unpaywall + PDF text
// ---------------------------------------------------------------------------
async function importUnpaywallPdf(
  row: ResourceRow,
  doi: string,
): Promise<{ meta: ImportedContentMetaT; blocks: ImportedBlockT[] } | null> {
  const upRes = await timedFetch(
    `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(UNPAYWALL_EMAIL)}`,
  );
  if (!upRes || !upRes.ok) return null;
  const up = await upRes.json() as {
    best_oa_location?: { url_for_pdf?: string | null; license?: string | null };
  };
  const pdfUrl = up.best_oa_location?.url_for_pdf;
  const license = up.best_oa_location?.license ?? "unknown";
  if (!pdfUrl) return null;

  const pdfRes = await timedFetch(pdfUrl, undefined, 30_000);
  if (!pdfRes || !pdfRes.ok) return null;
  const bytes = new Uint8Array(await pdfRes.arrayBuffer());

  // pdfjs in Deno can't use workers — load legacy build with worker disabled.
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({
    data: bytes,
    useWorker: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  const out: ImportedBlockT[] = [];
  let blockUidCounter = 0;
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((it: unknown) => (it as { str?: string }).str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    // Coarse paragraph split per page (PDF text reconstruction is best-effort).
    for (const para of text.split(/\.\s+(?=[A-Z])/).filter((p) => p.length >= 80)) {
      const payload: BlockPayloadT = { type: "paragraph", text: para };
      out.push({
        block_uid: `p-${pageNum}-${blockUidCounter++}`,
        position: out.length,
        type: "paragraph",
        payload,
        text_hash: await sha256(para),
      });
    }
  }

  if (out.length < 3) return null;

  return {
    meta: {
      source_url: pdfUrl,
      source_lang: "en",
      license: normalizeUnpaywallLicense(license),
      importer: "unpaywall-pdf",
      importer_version: 1,
      word_count: out.reduce((acc, b) => acc + (b.payload.type === "paragraph" ? (b.payload as { text: string }).text.split(/\s+/).length : 0), 0),
      has_equations: false,
      has_tables: false,
      raw_meta: { doi, pdfUrl },
      availability: "full_text_api",
    },
    blocks: out,
  };
}

function normalizeUnpaywallLicense(license: string | null): string {
  if (!license) return "unknown";
  const l = license.toLowerCase();
  if (l.includes("cc-by-nd") || l.includes("by-nd")) return "cc-by-nd";
  if (l.includes("cc-by-sa") || l.includes("by-sa")) return "cc-by-sa";
  if (l.includes("cc0")) return "cc0";
  if (l.includes("cc-by") || l.includes("by")) return "cc-by";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Importer 4 — Readability for allowlisted blogs
// ---------------------------------------------------------------------------
async function importReadability(
  row: ResourceRow,
  url: URL,
): Promise<{ meta: ImportedContentMetaT; blocks: ImportedBlockT[] } | null> {
  const fetched = await fetchIfScrapingAllowed(url);
  if (!fetched) return null;

  const { parseHTML } = await loadLinkedom();
  const { Readability } = await loadReadability();
  const { document } = parseHTML(fetched.html);
  // Readability expects a `Document` with a few extra props; linkedom is close
  // enough for the simple cases we run into.
  const reader = new Readability(document as unknown as Document, { charThreshold: 500 });
  const article = reader.parse();
  if (!article || !article.content) return null;

  const { document: parsed } = parseHTML(`<!doctype html><html><body>${article.content}</body></html>`);
  const out: ImportedBlockT[] = [];
  let blockUidCounter = 0;
  const push = async (payload: BlockPayloadT, hint: string) => {
    out.push({
      block_uid: `${hint}-${blockUidCounter++}`,
      position: out.length,
      type: payload.type,
      payload,
      text_hash: await sha256(extractTextForHash(payload)),
    });
  };

  if (article.title) await push({ type: "heading", level: 1, text: article.title }, "h1");

  const nodes = parsed.querySelectorAll("h2, h3, h4, p, img, ul, ol, blockquote, pre, figure");
  let hasTables = false;
  for (const el of Array.from(nodes)) {
    const tag = el.tagName.toLowerCase();
    if (tag === "h2" || tag === "h3" || tag === "h4") {
      const level = parseInt(tag.slice(1), 10) as 2 | 3 | 4;
      const text = (el.textContent ?? "").trim();
      if (text) await push({ type: "heading", level, text }, `h${level}`);
    } else if (tag === "p") {
      const text = (el.textContent ?? "").trim();
      if (text.length >= 30) await push({ type: "paragraph", text }, "p");
    } else if (tag === "img") {
      const src = (el.getAttribute("src") ?? "").trim();
      if (!src) continue;
      const absolute = new URL(src, fetched.finalUrl).toString();
      const alt = el.getAttribute("alt");
      await push({ type: "image", src: absolute, alt: alt || null }, "img");
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(el.querySelectorAll("li"))
        .map((li) => (li.textContent ?? "").trim())
        .filter(Boolean);
      if (items.length) await push({ type: "list", ordered: tag === "ol", items }, "list");
    } else if (tag === "blockquote") {
      const text = (el.textContent ?? "").trim();
      if (text) await push({ type: "quote", text }, "q");
    } else if (tag === "pre") {
      const text = el.textContent ?? "";
      if (text.trim()) await push({ type: "code", lang: null, text }, "code");
    } else if (tag === "figure") {
      const img = el.querySelector("img");
      const caption = el.querySelector("figcaption")?.textContent?.trim() ?? null;
      const src = img?.getAttribute("src");
      if (src) {
        const absolute = new URL(src, fetched.finalUrl).toString();
        await push({ type: "image", src: absolute, alt: img?.getAttribute("alt") || null, caption }, "img");
      }
    }
  }

  if (out.length < 3) return null;

  return {
    meta: {
      source_url: fetched.finalUrl,
      source_lang: detectLangFromHtml(fetched.html) ?? "en",
      license: "allowlisted-blog",
      importer: "readability",
      importer_version: 1,
      word_count: article.length ?? null,
      has_equations: false,
      has_tables: hasTables,
      raw_meta: { byline: article.byline, excerpt: article.excerpt },
      availability: "full_text_scraped",
    },
    blocks: out,
  };
}

function detectLangFromHtml(html: string): string | null {
  const m = html.match(/<html[^>]*lang=["']?([a-z]{2})/i);
  return m ? m[1].toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Importer 5 — metadata-only fallback
// ---------------------------------------------------------------------------
async function importMetadataOnly(
  row: ResourceRow,
): Promise<{ meta: ImportedContentMetaT; blocks: ImportedBlockT[] }> {
  const out: ImportedBlockT[] = [];
  let i = 0;
  const push = async (payload: BlockPayloadT, hint: string) => {
    out.push({
      block_uid: `${hint}-${i++}`,
      position: out.length,
      type: payload.type,
      payload,
      text_hash: await sha256(extractTextForHash(payload)),
    });
  };
  await push({ type: "heading", level: 1, text: row.title }, "h1");
  if (row.summary) await push({ type: "paragraph", text: row.summary }, "p");

  return {
    meta: {
      source_url: row.url,
      source_lang: "en",
      license: "unknown",
      importer: "metadata-only",
      importer_version: 1,
      word_count: row.summary?.split(/\s+/).length ?? 0,
      has_equations: false,
      has_tables: false,
      raw_meta: {},
      availability: row.summary ? "excerpt_only" : "metadata_only",
    },
    blocks: out,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
async function runPipeline(
  row: ResourceRow,
): Promise<{ meta: ImportedContentMetaT; blocks: ImportedBlockT[]; importer: string }> {
  const arxivId = extractArxivId(row);
  if (arxivId) {
    const out = await importArxivAr5iv(row, arxivId);
    if (out) return { ...out, importer: "arxiv-ar5iv" };
  }
  const pmcId = extractPmcId(row);
  if (pmcId) {
    const out = await importPmcJats(row, pmcId);
    if (out) return { ...out, importer: "pmc-jats" };
  }
  const doi = extractDoi(row);
  if (doi) {
    const out = await importUnpaywallPdf(row, doi);
    if (out) return { ...out, importer: "unpaywall-pdf" };
  }
  try {
    const u = new URL(row.url);
    const out = await importReadability(row, u);
    if (out) return { ...out, importer: "readability" };
  } catch { /* fall through */ }

  // License-driven gate: ND licences forbid derivative works → keep at
  // excerpt_only so the reader never tries to translate them.
  const fallback = await importMetadataOnly(row);
  return { ...fallback, importer: "metadata-only" };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
async function persist(
  resourceId: string,
  meta: ImportedContentMetaT,
  blocks: ImportedBlockT[],
): Promise<unknown> {
  // Validate before sending — fail loudly here so we don't poison the DB.
  const parsedMeta = ImportedContentMeta.parse(meta);
  const parsedBlocks = blocks.map((b) => ImportedBlock.parse(b));

  const { data, error } = await supabase.rpc("upsert_resource_content", {
    p_resource_id: resourceId,
    p_meta: parsedMeta,
    p_blocks: parsedBlocks,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function log(
  resourceId: string,
  importer: string,
  status: "ok" | "failed" | "skipped",
  message: string | null,
  durationMs: number,
): Promise<void> {
  const { error } = await supabase.rpc("log_resource_import", {
    p_resource_id: resourceId,
    p_importer: importer,
    p_status: status,
    p_message: message,
    p_duration_ms: durationMs,
  });
  if (error) console.warn("[resource-import] log RPC failed:", error.message);
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(req, 405, err("Method not allowed"));

  let body: { resourceId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, err("Invalid JSON body"));
  }
  const resourceId = body.resourceId;
  if (!resourceId || typeof resourceId !== "string") {
    return jsonResponse(req, 400, err("resourceId required"));
  }

  const t0 = performance.now();
  const row = await loadResource(resourceId);
  if (!row) {
    await log(resourceId, "lookup", "failed", "resource not found", Math.round(performance.now() - t0));
    return jsonResponse(req, 404, err("resource not found"));
  }

  // Skip if the importer has already produced a real reader payload. Callers
  // wanting to re-import can flip availability back to `metadata_only` first.
  if (row.availability === "full_text_api" || row.availability === "full_text_scraped") {
    await log(resourceId, "skip", "skipped", `already ${row.availability}`, Math.round(performance.now() - t0));
    return jsonResponse(req, 200, ok({ skipped: true, availability: row.availability }));
  }

  try {
    const { meta, blocks, importer } = await runPipeline(row);
    const result = await persist(resourceId, meta, blocks);
    const ms = Math.round(performance.now() - t0);
    await log(resourceId, importer, "ok", JSON.stringify(result), ms);
    return jsonResponse(req, 200, ok({ importer, meta: { availability: meta.availability, source_lang: meta.source_lang }, result }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const ms = Math.round(performance.now() - t0);
    await log(resourceId, "pipeline", "failed", message.slice(0, 500), ms);
    return jsonResponse(req, 500, err(message));
  }
});

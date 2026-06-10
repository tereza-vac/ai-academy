/**
 * LLM catalog ingestion — refreshes public.llm_models from public web APIs.
 *
 * Sources:
 *   - OpenRouter /api/v1/models (commercial + hosted OSS, pricing, context)
 *   - Hugging Face /api/models (trending downloads — enriches open-source coverage)
 *
 * Curated rows (preserve_curated = true) keep editorial description_md and use cases;
 * ingest still updates context_window, pricing_hint, fetched_at when matched by slug.
 */
import { createClient } from "@supabase/supabase-js";
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const USER_AGENT = Deno.env.get("RSS_USER_AGENT") ?? "AI-Academy-Models/0.1";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type LicenseType = "commercial" | "open_source" | "research" | "unknown";
type PopularityTier = "mainstream" | "emerging" | "niche" | "legacy";
type Source = "curated" | "openrouter" | "huggingface";

interface ModelRow {
  slug: string;
  name: string;
  provider: string;
  family: string | null;
  license_type: LicenseType;
  modalities: string[];
  context_window: number | null;
  parameter_count: string | null;
  release_date: string | null;
  summary: string | null;
  description_md: string | null;
  typical_use_cases: string[];
  strengths: string[];
  limitations: string[];
  tags: string[];
  homepage_url: string | null;
  docs_url: string | null;
  pricing_hint: string | null;
  is_niche: boolean;
  popularity_tier: PopularityTier;
  external_id: string | null;
  source: Source;
  preserve_curated: boolean;
  raw: Record<string, unknown>;
  score: number;
}

interface IngestSummary {
  openrouter: number;
  huggingface: number;
  upserted: number;
  errors: string[];
}

const OPEN_WEIGHT_HINTS = [
  "llama", "mistral", "mixtral", "qwen", "deepseek", "phi", "gemma", "falcon",
  "yi-", "olmo", "nemotron", "granite", "zephyr", "vicuna", "wizard", "openchat",
  "nous", "hermes", "dolphin", "bge", "e5-", "stable-diffusion", "flux",
];

// First-party flagship families, matched by OpenRouter `provider/model` id
// prefix. A hit marks the model mainstream and boosts its score so newly
// released flagships (e.g. `anthropic/claude-fable-5`) surface near the top
// instead of sinking below hundreds of community models. Version-agnostic on
// purpose — new Claude/GPT/Gemini releases are recognised without a code change.
const FLAGSHIP_PREFIXES = [
  "anthropic/claude",
  "openai/gpt", "openai/o1", "openai/o3", "openai/o4", "openai/chatgpt",
  "google/gemini", "google/gemma",
  "x-ai/grok",
  "meta-llama/llama",
  "deepseek/deepseek",
  "mistralai/mistral", "mistralai/mixtral", "mistralai/magistral",
  "qwen/qwen",
  "cohere/command",
  "amazon/nova",
];

const LEGACY_HINTS = [
  "gpt-3.5", "gpt-3", "davinci", "babbage", "ada", "curie",
  "claude-1", "claude-2", "claude-instant", "text-davinci",
];

function isFlagship(id: string): boolean {
  const low = id.toLowerCase().replace(/^~+/, "");
  return FLAGSHIP_PREFIXES.some((p) => low.startsWith(p));
}

/** OpenRouter `created` is unix seconds; tolerate ms too. Returns YYYY-MM-DD. */
function isoDateFromUnix(value?: number): string | null {
  if (!value || !Number.isFinite(value)) return null;
  const ms = value > 1e12 ? value : value * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function slugify(provider: string, id: string): string {
  const base = `${provider}-${id}`.toLowerCase()
    .replace(/[/\\]+/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 120) || "model";
}

function inferLicense(id: string, name: string): LicenseType {
  const hay = `${id} ${name}`.toLowerCase();
  if (OPEN_WEIGHT_HINTS.some((h) => hay.includes(h))) return "open_source";
  if (hay.includes("gpt") || hay.includes("claude") || hay.includes("gemini") ||
      hay.includes("command") || hay.includes("grok") || hay.includes("jamba")) {
    return "commercial";
  }
  return "unknown";
}

function inferPopularity(id: string, downloads?: number): PopularityTier {
  const hay = id.toLowerCase();
  if (LEGACY_HINTS.some((h) => hay.includes(h))) return "legacy";
  if (isFlagship(id)) return "mainstream";
  if (downloads != null) {
    if (downloads >= 500_000) return "mainstream";
    if (downloads < 50_000) return "niche";
  }
  return "emerging";
}

function parseModalities(arch?: {
  input_modalities?: string[];
  output_modalities?: string[];
  modality?: string;
}): string[] {
  const set = new Set<string>();
  for (const m of arch?.input_modalities ?? []) set.add(m);
  for (const m of arch?.output_modalities ?? []) set.add(m);
  if (arch?.modality) {
    for (const part of arch.modality.split(/[+>]+/)) {
      const t = part.trim().toLowerCase();
      if (t && t !== "text") set.add(t);
    }
  }
  if (set.size === 0) set.add("text");
  return [...set];
}

function pricingHint(pricing?: { prompt?: string; completion?: string }): string | null {
  if (!pricing?.prompt) return null;
  const p = parseFloat(pricing.prompt);
  const c = parseFloat(pricing.completion ?? "0");
  if (Number.isNaN(p)) return "Paid API";
  const perM = (p * 1_000_000).toFixed(2);
  const perMc = (c * 1_000_000).toFixed(2);
  return `~$${perM}/M in · $${perMc}/M out`;
}

function scoreFor(
  id: string,
  context?: number,
  downloads?: number,
  createdSec?: number,
): number {
  let s = 40;
  if (isFlagship(id)) s += 45;
  if (context) {
    if (context >= 1_000_000) s += 16;
    else if (context >= 200_000) s += 12;
    else if (context >= 128_000) s += 8;
    else if (context >= 32_000) s += 4;
  }
  if (downloads) s += Math.min(28, Math.log10(downloads + 1) * 8);
  // Recency: brand-new releases get a boost that decays over ~18 months, so a
  // freshly launched flagship outranks an older one of the same family.
  if (createdSec && createdSec > 0) {
    const ageDays = (Date.now() / 1000 - createdSec) / 86_400;
    if (ageDays >= 0 && ageDays <= 540) s += Math.round((1 - ageDays / 540) * 14);
  }
  return Math.round(s * 10) / 10;
}

async function fetchOpenRouter(): Promise<ModelRow[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const body = await res.json() as { data?: Array<Record<string, unknown>> };
  const rows: ModelRow[] = [];

  for (const m of body.data ?? []) {
    const id = String(m.id ?? "");
    if (!id) continue;
    // Skip OpenRouter variant aliases (e.g. `~anthropic/claude-fable-latest`):
    // they duplicate a concrete versioned model and produce junk provider names.
    if (id.startsWith("~")) continue;
    const [providerPart] = id.split("/");
    const provider = (providerPart ?? "unknown").replace(/-/g, " ");
    const name = String(m.name ?? id);
    const license = inferLicense(id, name);
    const arch = m.architecture as ModelRow["raw"] | undefined;
    const context = typeof m.context_length === "number" ? m.context_length : null;
    const created = typeof m.created === "number" ? m.created : undefined;
    const slug = slugify(providerPart ?? "model", id.replace(/^[^/]+\//, ""));

    rows.push({
      slug,
      name,
      provider: provider.charAt(0).toUpperCase() + provider.slice(1),
      family: id.split("/")[0] ?? null,
      license_type: license,
      modalities: parseModalities(arch as Parameters<typeof parseModalities>[0]),
      context_window: context,
      parameter_count: null,
      release_date: isoDateFromUnix(created),
      summary: typeof m.description === "string"
        ? m.description.slice(0, 280)
        : null,
      description_md: typeof m.description === "string"
        ? `## ${name}\n\n${m.description}`
        : null,
      typical_use_cases: license === "open_source"
        ? ["Self-hosting", "Fine-tuning", "Research"]
        : ["API integration", "Assistants", "Agents"],
      strengths: [],
      limitations: license === "commercial" ? ["Closed weights"] : [],
      tags: ["openrouter", license === "open_source" ? "open-weights" : "api"],
      homepage_url: "https://openrouter.ai/models",
      docs_url: null,
      pricing_hint: pricingHint(m.pricing as { prompt?: string; completion?: string }),
      is_niche: inferPopularity(id) === "niche",
      popularity_tier: inferPopularity(id),
      external_id: id,
      source: "openrouter",
      preserve_curated: false,
      raw: m as Record<string, unknown>,
      score: scoreFor(id, context ?? undefined, undefined, created),
    });
  }
  return rows;
}

interface HfModel {
  id?: string;
  modelId?: string;
  downloads?: number;
  pipeline_tag?: string;
  tags?: string[];
}

async function fetchHuggingFace(limit = 40): Promise<ModelRow[]> {
  const url = new URL("https://huggingface.co/api/models");
  url.searchParams.set("sort", "downloads");
  url.searchParams.set("direction", "-1");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HuggingFace ${res.status}`);
  const list = await res.json() as HfModel[];
  const rows: ModelRow[] = [];

  for (const m of list) {
    const modelId = m.modelId ?? m.id;
    if (!modelId) continue;
    const [org] = modelId.split("/");
    const slug = slugify(org ?? "hf", modelId.replace("/", "-"));
    const tag = m.pipeline_tag ?? "text-generation";
    const modalities = tag.includes("text-to-image") || tag.includes("image")
      ? ["image"]
      : ["text"];
    const downloads = m.downloads ?? 0;

    rows.push({
      slug,
      name: modelId.split("/").pop() ?? modelId,
      provider: org ?? "Hugging Face",
      family: org ?? null,
      license_type: "open_source",
      modalities,
      context_window: null,
      parameter_count: null,
      release_date: null,
      summary: `Trending on Hugging Face (${downloads.toLocaleString()} downloads). Pipeline: ${tag}.`,
      description_md: `## ${modelId}\n\nOpen model on the Hugging Face Hub. Pipeline tag: **${tag}**.`,
      typical_use_cases: ["Fine-tuning", "Self-host", "Research", "Evaluations"],
      strengths: ["Open weights on Hub", "Community tooling"],
      limitations: ["You operate inference infrastructure"],
      tags: ["huggingface", tag],
      homepage_url: `https://huggingface.co/${modelId}`,
      docs_url: `https://huggingface.co/${modelId}`,
      pricing_hint: "Free weights (compute not included)",
      is_niche: downloads < 100_000,
      popularity_tier: inferPopularity(modelId, downloads),
      external_id: modelId,
      source: "huggingface",
      preserve_curated: false,
      raw: m as Record<string, unknown>,
      score: scoreFor(modelId, undefined, downloads),
    });
  }
  return rows;
}

async function loadCuratedSlugs(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("llm_models")
    .select("slug")
    .eq("preserve_curated", true);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.slug as string));
}

async function upsertBatch(rows: ModelRow[], curatedSlugs: Set<string>): Promise<number> {
  const CHUNK = 50;
  let count = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

    const full = chunk
      .filter((r) => !curatedSlugs.has(r.slug))
      .map((r) => ({ ...r, fetched_at: now }));

    const curatedOnly = chunk.filter((r) => curatedSlugs.has(r.slug));

    if (full.length > 0) {
      const { error } = await supabase.from("llm_models").upsert(full, {
        onConflict: "slug",
      });
      if (error) throw new Error(error.message);
      count += full.length;
    }

    for (const r of curatedOnly) {
      const { error } = await supabase.from("llm_models").update({
        context_window: r.context_window,
        pricing_hint: r.pricing_hint,
        external_id: r.external_id,
        raw: r.raw,
        score: r.score,
        fetched_at: now,
      }).eq("slug", r.slug);
      if (error) throw new Error(error.message);
      count += 1;
    }
  }
  return count;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(req, 405, err("Method not allowed"));
  }

  const summary: IngestSummary = {
    openrouter: 0,
    huggingface: 0,
    upserted: 0,
    errors: [],
  };

  const all: ModelRow[] = [];
  const bySlug = new Map<string, ModelRow>();

  try {
    const orRows = await fetchOpenRouter();
    summary.openrouter = orRows.length;
    for (const r of orRows) bySlug.set(r.slug, r);
  } catch (e) {
    summary.errors.push(`openrouter: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const hfRows = await fetchHuggingFace();
    summary.huggingface = hfRows.length;
    for (const r of hfRows) {
      if (!bySlug.has(r.slug)) bySlug.set(r.slug, r);
    }
  } catch (e) {
    summary.errors.push(`huggingface: ${e instanceof Error ? e.message : String(e)}`);
  }

  for (const r of bySlug.values()) all.push(r);

  if (all.length > 0) {
    try {
      const curatedSlugs = await loadCuratedSlugs();
      summary.upserted = await upsertBatch(all, curatedSlugs);
    } catch (e) {
      summary.errors.push(`upsert: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return jsonResponse(req, 200, ok(summary));
});

/**
 * TutorContextPanel — right-side panel showing the current AI Map concept,
 * learning progress for it, and a "What to study next" path suggestion.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, MapPin, Network, Sparkles, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TutorContext } from "@/services/tutorApi";
import {
  ALL_NODES,
  getNode,
  pickLocaleText,
  DOMAIN_COLORS,
  type ConceptNode,
} from "@/lib/aiMapData";
import {
  getConceptProgress,
  getStudiedConceptIds,
  masteryLevel,
} from "@/services/learningProgress";

interface Props {
  context: TutorContext;
  onClose?: () => void;
  className?: string;
}

const COPY = {
  contextHeading: { cs: "Kontext: AI Mapa", en: "Context: AI Map" },
  domainLabel: { cs: "Obor", en: "Domain" },
  summaryHeading: { cs: "O čem to je", en: "What it's about" },
  mapLinkLabel: { cs: "Otevřít v AI Mapě", en: "Open in AI Map" },
  nextHeading: { cs: "Co studovat dál", en: "What to study next" },
  progressLabel: { cs: "Tvůj pokrok", en: "Your progress" },
  levelNames: {
    cs: ["Neprůzkumáno", "Prozkoumáno", "Studováno", "Zvládnuto"],
    en: ["Not started", "Explored", "Studied", "Mastered"],
  },
  noContext: {
    cs: "Žádný kontext není nastaven. Otevři AI Mapu a klikni na pojm — ten se pak zobrazí tady.",
    en: "No context set. Open the AI Map and click a concept — it will appear here.",
  },
};
const t = (key: keyof typeof COPY, locale = "en") =>
  COPY[key][locale as "cs" | "en"] ?? COPY[key]["en"];

/* ─── Learning path suggestion ───────────────────────────────────────────── */

function suggestNext(
  conceptId: string,
  _locale: string,
  limit = 4,
): ConceptNode[] {
  const node = getNode(conceptId);
  if (!node) return [];

  const studied = getStudiedConceptIds();
  const candidates: Array<{ node: ConceptNode; priority: number }> = [];

  // 1. Explicit related[] nodes
  for (const relId of node.related ?? []) {
    const rel = getNode(relId);
    if (!rel || rel.id === conceptId) continue;
    const progress = getConceptProgress(rel.id);
    const lvl = progress ? masteryLevel(progress) : 0;
    if (lvl < 3) candidates.push({ node: rel, priority: 10 - lvl * 2 });
  }

  // 2. Sibling concepts in the same domain (not yet mastered)
  const siblings = ALL_NODES.filter(
    (n) =>
      n.domain === node.domain &&
      n.id !== conceptId &&
      n.id !== node.domain &&
      n.id !== "ai-root",
  );
  for (const sib of siblings) {
    const already = candidates.some((c) => c.node.id === sib.id);
    if (already) continue;
    const progress = getConceptProgress(sib.id);
    const lvl = progress ? masteryLevel(progress) : 0;
    if (lvl < 3) candidates.push({ node: sib, priority: 4 - lvl });
  }

  // 3. Bridge concepts: studied nodes' related that we haven't seen yet
  for (const sid of studied) {
    if (sid === conceptId) continue;
    const sNode = getNode(sid);
    if (!sNode) continue;
    for (const relId of sNode.related ?? []) {
      const rel = getNode(relId);
      if (!rel || rel.id === conceptId) continue;
      const already = candidates.some((c) => c.node.id === rel.id);
      if (already) continue;
      if (!studied.has(rel.id)) {
        candidates.push({ node: rel, priority: 2 });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  // Deduplicate
  const seen = new Set<string>();
  const results: ConceptNode[] = [];
  for (const { node: n } of candidates) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    results.push(n);
    if (results.length >= limit) break;
  }
  return results;
}

/* ─── Progress bar ────────────────────────────────────────────────────────── */

function ProgressBadge({ conceptId, locale }: { conceptId: string; locale: string }) {
  const progress = useMemo(() => getConceptProgress(conceptId), [conceptId]);
  if (!progress) return null;

  const lvl = masteryLevel(progress);
  const levelNames = (COPY.levelNames as Record<string, string[]>)[locale as "cs" | "en"] ?? COPY.levelNames.en;
  const barWidths = ["0%", "33%", "66%", "100%"];
  const barColors = ["bg-border-subtle", "bg-yellow-400", "bg-blue-500", "bg-success"];

  return (
    <div className="space-y-1.5 rounded-xl border border-border-subtle bg-surface-base px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-caption-xs text-content-tertiary">{t("progressLabel", locale)}</span>
        <span className={cn(
          "text-caption-xs font-medium",
          lvl >= 3 ? "text-success" : lvl >= 2 ? "text-blue-500" : "text-yellow-600",
        )}>
          {levelNames[lvl]}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColors[lvl])}
          style={{ width: barWidths[lvl] }}
        />
      </div>
      <div className="text-[10px] text-content-tertiary/60">
        {locale === "cs"
          ? `${progress.visitCount} návštěv · ${progress.messageCount} zpráv`
          : `${progress.visitCount} visits · ${progress.messageCount} messages`}
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function TutorContextPanel({ context, onClose, className }: Props) {
  const navigate = useNavigate();
  const locale = (context.locale ?? "en") as "cs" | "en";
  const hasContext = Boolean(context.conceptId);

  const nextConcepts = useMemo(
    () => (context.conceptId ? suggestNext(context.conceptId, locale) : []),
    [context.conceptId, locale],
  );

  return (
    <aside
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-elevated p-4 overflow-y-auto",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-content-tertiary shrink-0" />
          <span className="text-caption-xs uppercase tracking-wide text-content-tertiary font-medium">
            {t("contextHeading", locale)}
          </span>
        </div>
        {onClose && (
          <Button size="icon-sm" variant="ghost" onClick={onClose} className="-mr-1">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!hasContext ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Network className="h-8 w-8 text-content-tertiary opacity-40" />
          <p className="text-body-sm text-content-tertiary">{t("noContext", locale)}</p>
          <Link to="/map">
            <Button variant="outline" size="sm">
              <Network className="h-3.5 w-3.5" />
              {locale === "cs" ? "AI Mapa" : "AI Map"}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Concept header */}
          <div className="space-y-1.5">
            <h3 className="text-heading-sm font-semibold text-content-primary">
              {context.conceptLabel ?? context.conceptId}
            </h3>
            {context.domain && (
              <div className="flex items-center gap-1.5">
                <span className="text-caption-xs text-content-tertiary">{t("domainLabel", locale)}:</span>
                <Badge variant="muted" className="text-caption-xs">
                  {context.domain}
                </Badge>
              </div>
            )}
          </div>

          {/* Learning progress */}
          {context.conceptId && (
            <ProgressBadge conceptId={context.conceptId} locale={locale} />
          )}

          {/* Summary */}
          {context.conceptSummary && (
            <div className="space-y-1">
              <p className="text-caption-xs uppercase tracking-wide text-content-tertiary font-medium">
                {t("summaryHeading", locale)}
              </p>
              <p className="text-body-sm text-content-secondary leading-relaxed line-clamp-6">
                {context.conceptSummary}
              </p>
            </div>
          )}

          {/* Link to map */}
          <Link to="/map">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-3.5 w-3.5" />
              {t("mapLinkLabel", locale)}
            </Button>
          </Link>

          {/* What to study next */}
          {nextConcepts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary/70" />
                <p className="text-caption-xs uppercase tracking-wide text-content-tertiary font-medium">
                  {t("nextHeading", locale)}
                </p>
              </div>
              <div className="space-y-1">
                {nextConcepts.map((node) => {
                  const label = pickLocaleText(node.label, locale);
                  const color = DOMAIN_COLORS[node.domain] ?? "hsl(var(--primary))";
                  const progress = getConceptProgress(node.id);
                  const lvl = progress ? masteryLevel(progress) : 0;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => navigate(`/tutor?conceptId=${encodeURIComponent(node.id)}`)}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all",
                        "border-border-subtle bg-surface-base hover:border-primary/30 hover:bg-primary/5",
                        "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                      )}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 min-w-0 text-caption-xs font-medium text-content-secondary group-hover:text-content-primary truncate">
                        {label}
                      </span>
                      {lvl > 0 && (
                        <Zap className="h-2.5 w-2.5 shrink-0 text-primary/50" />
                      )}
                      <ArrowRight className="h-3 w-3 shrink-0 text-content-tertiary/40 group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

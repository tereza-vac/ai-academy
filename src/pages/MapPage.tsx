import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  ExternalLink,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";
import {
  DOMAINS,
  DOMAIN_BRIDGES,
  DOMAIN_COLORS,
  conceptsForDomain,
  getNode,
  pickLocaleText,
  type ConceptNode,
} from "@/lib/aiMapData";
import type { Locales } from "@/i18n/i18n-types";

/* -------------------------------------------------------------------------- */
/* Page-local copy                                                             */
/* -------------------------------------------------------------------------- */

const COPY = {
  eyebrow: { cs: "Mapa AI", en: "AI Map" },
  title: { cs: "Mapa AI světa", en: "Map of the AI world" },
  description: {
    cs: "Interaktivní stromová mapa pojmů a souvislostí. Klikni na obor a vyzkoušej, kam tě dovede — každý uzel umí říct, co znamená, proč na něm záleží a co s ním souvisí.",
    en: "An interactive tech-tree of concepts and how they connect. Click any pillar to expand it — every node explains what it is, why it matters and what it relates to.",
  },
  rootLabel: { cs: "AI", en: "AI" },
  rootHint: {
    cs: "Klikni na obor v okruhu a rozbal jeho podstrom.",
    en: "Click any pillar on the ring to expand it.",
  },
  backToOverview: { cs: "Zpět na přehled", en: "Back to overview" },
  conceptsHeading: { cs: "Podtémata", en: "Sub-topics" },
  parableHeading: { cs: "O co jde", en: "What it is" },
  whyHeading: { cs: "Proč na tom záleží", en: "Why it matters" },
  relatedHeading: { cs: "Související pojmy", en: "Related concepts" },
  referencesHeading: { cs: "Další čtení", en: "Further reading" },
  chatHeading: { cs: "Zeptej se asistenta", en: "Ask the assistant" },
  chatPlaceholder: { cs: "Zeptej se na cokoliv k tomuto pojmu…", en: "Ask anything about this concept…" },
  chatSend: { cs: "Poslat", en: "Send" },
  chatIntro: {
    cs: "Ahoj 👋 Jsem rychlý průvodce po tomto pojmu. Tady jsou tři nejčastější otázky:",
    en: "Hi 👋 I'm a quick tour guide for this concept. Here are the three most common questions:",
  },
  chatStarter1: { cs: "Vysvětli mi to v jedné větě.", en: "Explain it in one sentence." },
  chatStarter2: { cs: "Příklad z praxe?", en: "Real-world example?" },
  chatStarter3: { cs: "Co to NENÍ?", en: "What is it NOT?" },
  practiceCta: { cs: "Cvičení k tématu", en: "Practice this topic" },
  legendDomains: { cs: "Obory", en: "Pillars" },
  legendConcepts: { cs: "Podtémata", en: "Concepts" },
  legendBridges: { cs: "Souvislosti", en: "Connections" },
  noConcepts: { cs: "Tento obor zatím nemá rozbalené podtémata.", en: "No sub-topics for this pillar yet." },
  exampleAnswer: {
    cs: "Tohle ti odpovím za chviličku — chat bude napojený na model v dalším kroku. Zatím se mrkni do sekcí výše, najdeš tam to nejdůležitější.",
    en: "I'll have a real answer for you soon — the chat will be wired up to a model in the next step. For now, check the sections above for the essentials.",
  },
  practiceComingSoon: {
    cs: "Cvičení k tomuto pojmu připravujeme. Mrkni zatím do sekce Procvičování.",
    en: "Practice for this concept is on the way. Try the Practice section in the meantime.",
  },
} as const;

type CopyKey = keyof typeof COPY;

const t = (key: CopyKey, locale: Locales): string => {
  const entry = COPY[key];
  return locale === "cs" ? entry.cs : entry.en;
};

/* -------------------------------------------------------------------------- */
/* Geometry                                                                    */
/* -------------------------------------------------------------------------- */

const VIEWBOX = { x: -500, y: -500, w: 1000, h: 1000 };

const RING_RADIUS = 330;
const ROOT_RADIUS = 46;
const DOMAIN_RADIUS = 36;
const FOCUS_HUB_RADIUS = 56;
const FOCUS_CONCEPT_RADIUS = 24;
const FOCUS_CONCEPT_RING = 210;

interface Point {
  x: number;
  y: number;
}

function polar(angle: number, radius: number): Point {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/** Distribute N items evenly on a circle, starting from the top. */
function ringAngle(index: number, total: number): number {
  // Start at -π/2 (top) and rotate clockwise.
  return -Math.PI / 2 + (2 * Math.PI * index) / total;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function Component() {
  const locale = useLocaleStore(selectLocale);
  const [focusedDomain, setFocusedDomain] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  // Pre-compute layout. Memoised because re-deriving on every render flickers
  // SVG transitions when the parent state churns from chat messages.
  const layout = useMemo(() => {
    const domains = DOMAINS.map((d, i) => {
      const angle = ringAngle(i, DOMAINS.length);
      return {
        node: d,
        baseAngle: angle,
        basePos: polar(angle, RING_RADIUS),
      };
    });
    return { domains };
  }, []);

  const focusedNode = focusedDomain ? getNode(focusedDomain) : null;
  const focusedConcepts = focusedDomain ? conceptsForDomain(focusedDomain) : [];
  const selectedNode = selectedConcept ? getNode(selectedConcept) : null;

  // Escape closes whichever overlay is on top: chat > focus > overview.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (selectedConcept) setSelectedConcept(null);
      else if (focusedDomain) setFocusedDomain(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedDomain, selectedConcept]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("eyebrow", locale)}
        title={t("title", locale)}
        description={t("description", locale)}
        actions={
          focusedDomain ? (
            <Button
              variant="outline"
              onClick={() => {
                setFocusedDomain(null);
                setSelectedConcept(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToOverview", locale)}
            </Button>
          ) : (
            <Badge variant="muted" className="gap-1.5 px-2.5 py-1">
              <Compass className="h-3.5 w-3.5" />
              {t("rootHint", locale)}
            </Badge>
          )
        }
      />

      <Card variant="elevated" className="relative overflow-hidden">
        <MapCanvas
          locale={locale}
          layout={layout}
          focusedDomain={focusedDomain}
          onFocusDomain={(id) => {
            setFocusedDomain(id);
            setSelectedConcept(null);
          }}
          onSelectConcept={(id) => setSelectedConcept(id)}
        />
        <Legend locale={locale} />
      </Card>

      {focusedNode ? (
        <FocusBreakdown
          locale={locale}
          domain={focusedNode}
          concepts={focusedConcepts}
          onSelectConcept={(id) => setSelectedConcept(id)}
        />
      ) : null}

      {selectedNode ? (
        <ConceptPanel
          locale={locale}
          node={selectedNode}
          onClose={() => setSelectedConcept(null)}
          onJumpTo={(id) => {
            const target = getNode(id);
            if (!target) return;
            if (target.level === "domain") {
              setFocusedDomain(target.id);
              setSelectedConcept(null);
            } else {
              setFocusedDomain(target.domain);
              setSelectedConcept(target.id);
            }
          }}
        />
      ) : null}
    </div>
  );
}

export default Component;

/* -------------------------------------------------------------------------- */
/* Canvas — the radial SVG graph                                              */
/* -------------------------------------------------------------------------- */

interface MapCanvasProps {
  locale: Locales;
  layout: {
    domains: Array<{ node: ConceptNode; baseAngle: number; basePos: Point }>;
  };
  focusedDomain: string | null;
  onFocusDomain: (id: string) => void;
  onSelectConcept: (id: string) => void;
}

function MapCanvas({
  locale,
  layout,
  focusedDomain,
  onFocusDomain,
  onSelectConcept,
}: MapCanvasProps) {
  return (
    <div className="relative h-[640px] w-full">
      <svg
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        className="h-full w-full"
        role="img"
        aria-label={t("title", locale)}
      >
        <defs>
          <radialGradient id="ai-map-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(var(--brand-50))" stopOpacity="0.6" />
            <stop offset="60%" stopColor="hsl(var(--background))" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ai-map-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--brand-800))" />
          </radialGradient>
        </defs>

        <rect
          x={VIEWBOX.x}
          y={VIEWBOX.y}
          width={VIEWBOX.w}
          height={VIEWBOX.h}
          fill="url(#ai-map-bg)"
        />

        {/* Decorative concentric rings */}
        <g
          fill="none"
          stroke="hsl(var(--border-subtle))"
          strokeWidth={1}
          opacity={0.55}
        >
          <circle cx={0} cy={0} r={120} />
          <circle cx={0} cy={0} r={220} />
          <circle cx={0} cy={0} r={RING_RADIUS} />
          <circle cx={0} cy={0} r={420} strokeDasharray="2 6" />
        </g>

        {/* Bridges (cross-domain dotted edges) — only on overview */}
        {!focusedDomain ? (
          <BridgeLines layout={layout} />
        ) : (
          <FocusEdges
            focusedDomainId={focusedDomain}
            layout={layout}
            concepts={conceptsForDomain(focusedDomain)}
          />
        )}

        {/* Domain ring */}
        {layout.domains.map(({ node, baseAngle }) => (
          <DomainNode
            key={node.id}
            node={node}
            baseAngle={baseAngle}
            focusedDomain={focusedDomain}
            locale={locale}
            onFocus={() => onFocusDomain(node.id)}
          />
        ))}

        {/* Focused-domain concepts */}
        {focusedDomain ? (
          <FocusConcepts
            domainId={focusedDomain}
            locale={locale}
            onSelect={onSelectConcept}
          />
        ) : null}

        {/* Root "AI" node — only on overview */}
        {!focusedDomain ? <RootNode locale={locale} /> : null}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SVG sub-components                                                          */
/* -------------------------------------------------------------------------- */

function RootNode({ locale }: { locale: Locales }) {
  return (
    <g style={{ transition: "opacity 300ms ease" }}>
      <circle
        cx={0}
        cy={0}
        r={ROOT_RADIUS + 8}
        fill="hsl(var(--brand-soft))"
        opacity={0.7}
      />
      <circle cx={0} cy={0} r={ROOT_RADIUS} fill="url(#ai-map-core)" />
      <text
        x={0}
        y={6}
        textAnchor="middle"
        className="select-none"
        fontSize={22}
        fontWeight={700}
        fill="hsl(var(--primary-foreground))"
      >
        {t("rootLabel", locale)}
      </text>
    </g>
  );
}

function BridgeLines({
  layout,
}: {
  layout: MapCanvasProps["layout"];
}) {
  const byId = new Map(layout.domains.map((d) => [d.node.id, d.basePos]));
  return (
    <g>
      {DOMAIN_BRIDGES.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        // Bend the bridge toward the origin so adjacent bridges don't overlap.
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const tug = 0.35;
        const ctrl = { x: mid.x * (1 - tug), y: mid.y * (1 - tug) };
        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={`M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`}
            fill="none"
            stroke="hsl(var(--border-strong))"
            strokeWidth={1.25}
            strokeDasharray={edge.bridge ? "4 6" : undefined}
            opacity={0.7}
          />
        );
      })}
    </g>
  );
}

function FocusEdges({
  focusedDomainId,
  layout,
  concepts,
}: {
  focusedDomainId: string;
  layout: MapCanvasProps["layout"];
  concepts: ConceptNode[];
}) {
  // When focused, the domain animates to (0,0); its concepts spread on a small ring.
  // We render thin spokes from origin to each concept.
  const color = DOMAIN_COLORS[focusedDomainId] ?? "hsl(var(--primary))";
  // Avoid unused warning while keeping the API stable for future bridge highlights.
  void layout;
  return (
    <g>
      {concepts.map((c, i) => {
        const angle = ringAngle(i, concepts.length);
        const p = polar(angle, FOCUS_CONCEPT_RING);
        return (
          <line
            key={c.id}
            x1={0}
            y1={0}
            x2={p.x}
            y2={p.y}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.55}
          />
        );
      })}
    </g>
  );
}

function DomainNode({
  node,
  baseAngle,
  focusedDomain,
  locale,
  onFocus,
}: {
  node: ConceptNode;
  baseAngle: number;
  focusedDomain: string | null;
  locale: Locales;
  onFocus: () => void;
}) {
  const isFocused = focusedDomain === node.id;
  const isOther = focusedDomain !== null && !isFocused;

  const basePos = polar(baseAngle, RING_RADIUS);
  const farPos = polar(baseAngle, 460);

  const target = isFocused
    ? { x: 0, y: 0, r: FOCUS_HUB_RADIUS }
    : isOther
      ? { x: farPos.x, y: farPos.y, r: DOMAIN_RADIUS * 0.7 }
      : { x: basePos.x, y: basePos.y, r: DOMAIN_RADIUS };

  const color = DOMAIN_COLORS[node.id] ?? "hsl(var(--primary))";
  const labelOffset = isFocused ? 0 : Math.sign(basePos.y) * (target.r + 22) + (basePos.y === 0 ? -target.r - 14 : 0);

  // Anchor labels so they don't collide with the node circle.
  const labelAnchor: "start" | "middle" | "end" = isFocused
    ? "middle"
    : Math.abs(basePos.x) < 60
      ? "middle"
      : basePos.x > 0
        ? "start"
        : "end";
  const labelDx = isFocused ? 0 : labelAnchor === "middle" ? 0 : (basePos.x > 0 ? 1 : -1) * (target.r + 8);
  const labelDy = isFocused ? FOCUS_HUB_RADIUS + 22 : labelOffset || -target.r - 12;

  return (
    <g
      style={{
        transform: `translate(${target.x}px, ${target.y}px)`,
        transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease",
        opacity: isOther ? 0.35 : 1,
        cursor: "pointer",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onFocus();
      }}
    >
      <circle
        r={target.r + 6}
        fill={color}
        opacity={isFocused ? 0.18 : 0.12}
      />
      <circle
        r={target.r}
        fill="hsl(var(--surface-elevated))"
        stroke={color}
        strokeWidth={isFocused ? 3 : 2}
      />
      <text
        textAnchor="middle"
        y={5}
        fontSize={isFocused ? 18 : 13}
        fontWeight={700}
        fill="hsl(var(--text-primary))"
        className="select-none pointer-events-none"
      >
        {abbreviateDomain(pickLocaleText(node.label, locale))}
      </text>
      <text
        x={labelDx}
        y={labelDy}
        textAnchor={labelAnchor}
        fontSize={13}
        fontWeight={600}
        fill="hsl(var(--text-secondary))"
        className="select-none pointer-events-none"
        style={{ transition: "opacity 300ms ease" }}
        opacity={isFocused ? 1 : 0.95}
      >
        {pickLocaleText(node.label, locale)}
      </text>
    </g>
  );
}

/** Abbreviate long domain names so they fit inside the circle. */
function abbreviateDomain(label: string): string {
  if (label.length <= 6) return label;
  // Take initials of multi-word labels (e.g. "Machine Learning" → "ML").
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.map((w) => w[0]?.toUpperCase()).join("").slice(0, 4);
  }
  return label.slice(0, 4);
}

function FocusConcepts({
  domainId,
  locale,
  onSelect,
}: {
  domainId: string;
  locale: Locales;
  onSelect: (id: string) => void;
}) {
  const concepts = conceptsForDomain(domainId);
  const color = DOMAIN_COLORS[domainId] ?? "hsl(var(--primary))";

  if (concepts.length === 0) {
    return (
      <text
        x={0}
        y={FOCUS_CONCEPT_RING}
        textAnchor="middle"
        fontSize={14}
        fill="hsl(var(--text-tertiary))"
      >
        {t("noConcepts", locale)}
      </text>
    );
  }

  return (
    <g>
      {concepts.map((c, i) => {
        const angle = ringAngle(i, concepts.length);
        const p = polar(angle, FOCUS_CONCEPT_RING);
        const labelAnchor: "start" | "middle" | "end" =
          Math.abs(p.x) < 30 ? "middle" : p.x > 0 ? "start" : "end";
        const labelDx = labelAnchor === "middle" ? 0 : (p.x > 0 ? 1 : -1) * (FOCUS_CONCEPT_RADIUS + 6);
        const labelDy = Math.abs(p.x) < 30
          ? p.y > 0
            ? FOCUS_CONCEPT_RADIUS + 18
            : -FOCUS_CONCEPT_RADIUS - 8
          : 5;
        return (
          <g
            key={c.id}
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(c.id);
            }}
          >
            <circle
              r={FOCUS_CONCEPT_RADIUS}
              fill="hsl(var(--surface-elevated))"
              stroke={color}
              strokeWidth={2}
            />
            <circle
              r={FOCUS_CONCEPT_RADIUS - 8}
              fill={color}
              opacity={0.15}
            />
            <text
              x={labelDx}
              y={labelDy}
              textAnchor={labelAnchor}
              fontSize={12.5}
              fontWeight={600}
              fill="hsl(var(--text-primary))"
              className="select-none pointer-events-none"
            >
              {pickLocaleText(c.label, locale)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Legend({ locale }: { locale: Locales }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-xl border border-border-subtle bg-surface-elevated/85 px-3 py-2 text-caption-xs text-content-secondary backdrop-blur">
      <LegendDot color="hsl(var(--primary))" label={t("legendDomains", locale)} />
      <LegendDot color="hsl(var(--premium))" label={t("legendConcepts", locale)} />
      <LegendLine label={t("legendBridges", locale)} />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function LegendLine({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-px w-6 border-t border-dashed border-border-strong" />
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Focus breakdown — concept list rendered under the canvas                    */
/* -------------------------------------------------------------------------- */

function FocusBreakdown({
  locale,
  domain,
  concepts,
  onSelectConcept,
}: {
  locale: Locales;
  domain: ConceptNode;
  concepts: ConceptNode[];
  onSelectConcept: (id: string) => void;
}) {
  const color = DOMAIN_COLORS[domain.id] ?? "hsl(var(--primary))";
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <div>
            <div className="text-caption-xs uppercase tracking-wide text-content-tertiary">
              {t("eyebrow", locale)} · {pickLocaleText(domain.label, locale)}
            </div>
            <h2 className="text-heading-sm font-semibold tracking-tight text-content-primary">
              {t("conceptsHeading", locale)}
            </h2>
          </div>
        </div>
      </div>

      <p className="mb-4 max-w-2xl text-body-md text-content-secondary">
        {pickLocaleText(domain.tagline, locale)}
      </p>

      {concepts.length === 0 ? (
        <Card variant="soft" className="p-6 text-body-md text-content-secondary">
          {t("noConcepts", locale)}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {concepts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectConcept(c.id)}
              className="group text-left outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))] rounded-xl"
            >
              <Card variant="elevated" interactive className="h-full">
                <div className="space-y-2 p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="text-caption-xs uppercase tracking-wide text-content-tertiary">
                      {pickLocaleText(domain.label, locale)}
                    </span>
                  </div>
                  <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-content-primary group-hover:text-primary">
                    {pickLocaleText(c.label, locale)}
                  </h3>
                  <p className="line-clamp-3 text-body-md text-content-secondary">
                    {pickLocaleText(c.tagline, locale)}
                  </p>
                  <div className="inline-flex items-center gap-1 text-body-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    {locale === "cs" ? "Otevřít" : "Open"} <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Concept panel — slides in from the right, contains the mini-chatbot         */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
}

function ConceptPanel({
  locale,
  node,
  onClose,
  onJumpTo,
}: {
  locale: Locales;
  node: ConceptNode;
  onClose: () => void;
  onJumpTo: (id: string) => void;
}) {
  const isDomain = node.level === "domain";
  const domainNode = isDomain ? node : getNode(node.domain);
  const color = DOMAIN_COLORS[node.domain] ?? "hsl(var(--primary))";

  // Related = explicit related[] plus, for domains, all their concept ids.
  const relatedIds = useMemo(() => {
    const ids = new Set<string>(node.related ?? []);
    if (isDomain) conceptsForDomain(node.id).forEach((c) => ids.add(c.id));
    return Array.from(ids);
  }, [node, isDomain]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={pickLocaleText(node.label, locale)}
      className="fixed inset-0 z-50 flex"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/30 backdrop-blur-sm transition-opacity animate-fade-in"
      />
      <aside
        className={cn(
          "relative h-full w-full max-w-xl shrink-0 overflow-y-auto border-l border-border-subtle bg-surface-elevated shadow-elevation-md",
          "animate-fade-in",
        )}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: color }}
          aria-hidden
        />

        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-elevated/95 px-6 py-4 backdrop-blur">
          <div className="space-y-1">
            <div className="text-caption-xs uppercase tracking-wide text-content-tertiary">
              {isDomain
                ? t("eyebrow", locale)
                : `${t("eyebrow", locale)} · ${
                    domainNode ? pickLocaleText(domainNode.label, locale) : ""
                  }`}
            </div>
            <h2 className="text-heading-md font-semibold tracking-tight text-content-primary">
              {pickLocaleText(node.label, locale)}
            </h2>
            <p className="text-body-md text-content-secondary">
              {pickLocaleText(node.tagline, locale)}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <Section title={t("parableHeading", locale)}>
            <p className="text-body-md leading-relaxed text-content-secondary">
              {pickLocaleText(node.parable, locale)}
            </p>
          </Section>

          <Section title={t("whyHeading", locale)}>
            <p className="text-body-md leading-relaxed text-content-secondary">
              {pickLocaleText(node.whyItMatters, locale)}
            </p>
          </Section>

          {relatedIds.length > 0 ? (
            <Section title={t("relatedHeading", locale)}>
              <div className="flex flex-wrap gap-2">
                {relatedIds.map((id) => {
                  const rel = getNode(id);
                  if (!rel) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onJumpTo(id)}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-base px-3 py-1 text-body-sm text-content-secondary transition-colors hover:border-border-strong hover:text-content-primary outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]"
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            DOMAIN_COLORS[rel.domain] ?? "hsl(var(--primary))",
                        }}
                        aria-hidden
                      />
                      {pickLocaleText(rel.label, locale)}
                      <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </Section>
          ) : null}

          {node.references && node.references.length > 0 ? (
            <Section title={t("referencesHeading", locale)}>
              <ul className="space-y-1.5">
                {node.references.map((ref) => (
                  <li key={ref.url}>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-body-md font-medium text-primary hover:underline"
                    >
                      {ref.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <ConceptChat locale={locale} node={node} />

          <Card variant="soft" className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-body-md font-medium text-content-primary">
                  {t("practiceCta", locale)}
                </div>
                <p className="text-body-sm text-content-secondary">
                  {t("practiceComingSoon", locale)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-caption-xs uppercase tracking-wide text-content-tertiary">
        {title}
      </h3>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Mini chatbot — local-only placeholder. Will be replaced with a real model.  */
/* -------------------------------------------------------------------------- */

function ConceptChat({ locale, node }: { locale: Locales; node: ConceptNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "intro", role: "bot", text: t("chatIntro", locale) },
  ]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset the chat when the user switches concept or locale so the panel
  // doesn't leak yesterday's conversation when reopened on a new topic.
  useEffect(() => {
    setMessages([
      { id: "intro", role: "bot", text: t("chatIntro", locale) },
    ]);
    setDraft("");
  }, [locale, node.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    // Pretend the assistant is thinking briefly, then drop a canned reply.
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: "bot",
        text: cannedReply(trimmed, node, locale),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 420);
  }

  const starters = [
    t("chatStarter1", locale),
    t("chatStarter2", locale),
    t("chatStarter3", locale),
  ];

  return (
    <Card variant="soft" className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <MessageCircle className="h-4 w-4 text-content-secondary" />
        <span className="text-body-md font-semibold text-content-primary">
          {t("chatHeading", locale)}
        </span>
      </div>

      <div ref={scrollRef} className="max-h-72 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} text={m.text} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border-subtle px-4 pt-3">
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="rounded-full border border-border-subtle bg-surface-base px-3 py-1 text-caption-xs text-content-secondary transition-colors hover:border-border-strong hover:text-content-primary outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border-subtle px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chatPlaceholder", locale)}
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          <Send className="h-3.5 w-3.5" />
          {t("chatSend", locale)}
        </Button>
      </form>
    </Card>
  );
}

function ChatBubble({ role, text }: { role: ChatMessage["role"]; text: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-body-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-surface-elevated text-content-secondary border border-border-subtle",
        )}
      >
        {text}
      </div>
    </div>
  );
}

/**
 * Hand-rolled canned reply. Picks one of a handful of canned answers based on
 * keywords. The plan is to replace this with a real LLM call once the chat
 * backend lands; the calling shape (`text → reply`) is intentionally trivial.
 */
function cannedReply(input: string, node: ConceptNode, locale: Locales): string {
  const low = input.toLowerCase();
  const oneLiner = pickLocaleText(node.tagline, locale);
  const parable = pickLocaleText(node.parable, locale);
  const why = pickLocaleText(node.whyItMatters, locale);

  const isCs = locale === "cs";
  const example = isCs
    ? `Konkrétní příklad: ${parable}`
    : `Concrete example: ${parable}`;
  const notWhat = isCs
    ? `Není to: pravidlový systém, který fungoval před deep learning ér­ou — tady jsme dál.`
    : `What it's NOT: a hand-coded rule system from the pre-deep-learning era — we've moved past that.`;
  const oneSent = isCs
    ? `Jednou větou: ${oneLiner}`
    : `In one sentence: ${oneLiner}`;
  const practice = isCs
    ? `V praxi: ${why}`
    : `In practice: ${why}`;

  if (low.includes("nen") || low.includes("not")) return notWhat;
  if (low.includes("příklad") || low.includes("example") || low.includes("real")) return example;
  if (low.includes("jedn") || low.includes("one") || low.includes("věta")) return oneSent;
  if (low.includes("prax") || low.includes("practice") || low.includes("použ") || low.includes("use")) return practice;

  // Default reply nudges back to the structured content above.
  return t("exampleAnswer", locale);
}

/**
 * studyPlan — persist AI-generated personalized learning plans in localStorage.
 *
 * A plan has a goal, background, generated markdown content, and a list of
 * checklist items (concept IDs) that the user can tick off.
 */

const KEY_PREFIX = "tutor:plan:";
const INDEX_KEY  = "tutor:plans:index";
const MAX_PLANS  = 10;

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface PlanItem {
  id: string;
  text: string;       // human-readable step description
  conceptId?: string; // optional AI Map concept ID
  done: boolean;
}

export interface StudyPlan {
  id: string;
  goal: string;
  background: string;
  daysPerWeek: number;
  weeksTotal: number;
  generatedAt: string;   // ISO
  updatedAt: string;
  /** Full markdown content returned by the AI */
  content: string;
  /** Parsed checklist items extracted from the content */
  items: PlanItem[];
}

/* ─── Index ──────────────────────────────────────────────────────────────── */

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function writeIndex(ids: string[]): void {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(ids.slice(0, MAX_PLANS))); } catch { /* quota */ }
}

/* ─── Checklist extraction ───────────────────────────────────────────────── */

let _itemCounter = 0;

/**
 * Parse markdown for checklist-style lines and numbered steps.
 * Extracts them as PlanItem objects.
 */
export function extractItems(markdown: string, allConceptLabels: Map<string, string>): PlanItem[] {
  const items: PlanItem[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    // Match: "- [ ] ...", "- ..." under Day headers, or "1. ..."
    const checklist = line.match(/^[\s]*[-*]\s*(?:\[[ x]\]\s*)?(.+)/);
    const numbered  = line.match(/^[\s]*\d+\.\s+(.+)/);
    const match = checklist ?? numbered;
    if (!match) continue;

    const text = match[1].trim();
    if (text.length < 5) continue;

    // Try to find a matching concept label
    let conceptId: string | undefined;
    for (const [id, label] of allConceptLabels.entries()) {
      if (text.toLowerCase().includes(label.toLowerCase())) {
        conceptId = id;
        break;
      }
    }

    items.push({ id: `item-${++_itemCounter}`, text, conceptId, done: false });
  }

  return items;
}

/* ─── CRUD ───────────────────────────────────────────────────────────────── */

export function listPlans(): StudyPlan[] {
  return readIndex()
    .map((id) => {
      try {
        const raw = localStorage.getItem(KEY_PREFIX + id);
        return raw ? (JSON.parse(raw) as StudyPlan) : null;
      } catch { return null; }
    })
    .filter((p): p is StudyPlan => p !== null)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export function getPlan(id: string): StudyPlan | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + id);
    return raw ? (JSON.parse(raw) as StudyPlan) : null;
  } catch { return null; }
}

export function savePlan(plan: StudyPlan): void {
  try {
    localStorage.setItem(KEY_PREFIX + plan.id, JSON.stringify(plan));
    const idx = readIndex().filter((i) => i !== plan.id);
    writeIndex([plan.id, ...idx]);
  } catch { /* quota */ }
}

export function toggleItem(planId: string, itemId: string): StudyPlan | null {
  const plan = getPlan(planId);
  if (!plan) return null;
  const updated = {
    ...plan,
    updatedAt: new Date().toISOString(),
    items: plan.items.map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it,
    ),
  };
  savePlan(updated);
  return updated;
}

export function deletePlan(id: string): void {
  try { localStorage.removeItem(KEY_PREFIX + id); } catch { /* ignore */ }
  writeIndex(readIndex().filter((i) => i !== id));
}

export function clearAllPlans(): void {
  for (const id of readIndex()) {
    try { localStorage.removeItem(KEY_PREFIX + id); } catch { /* ignore */ }
  }
  try { localStorage.removeItem(INDEX_KEY); } catch { /* ignore */ }
}

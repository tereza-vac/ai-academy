/**
 * Read-only client for the synced Basecamp content.
 *
 * The actual sync runs server-side (`basecamp-sync` edge function); on the
 * frontend we only ever query the `basecamp_projects` and
 * `basecamp_recordings` tables that the sync populates.
 *
 * `manualVisibility` rules:
 *   - `'show'` always renders
 *   - `'hide'` never renders
 *   - `null` falls back to the keyword-based `is_ai_relevant` flag
 */
import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockBasecampProjects, mockBasecampRecordings } from "@/lib/mockData";
import type {
  BasecampProject,
  BasecampProjectWithActivity,
  BasecampRecording,
} from "@/types/domain";

interface ProjectRow {
  id: string;
  basecamp_id: number;
  name: string;
  description: string | null;
  purpose: string | null;
  status: string | null;
  url: string;
  app_url: string | null;
  is_ai_relevant: boolean;
  manual_visibility: "show" | "hide" | null;
  last_active_at: string | null;
  ingested_at: string;
}

interface RecordingRow {
  id: string;
  project_id: string;
  kind: string;
  title: string | null;
  excerpt: string | null;
  content_html: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  url: string | null;
  posted_at: string | null;
  edited_at: string | null;
}

const PROJECT_SELECT =
  "id,basecamp_id,name,description,purpose,status,url,app_url,is_ai_relevant,manual_visibility,last_active_at,ingested_at";
const RECORDING_SELECT =
  "id,project_id,kind,title,excerpt,content_html,author_name,author_avatar_url,url,posted_at,edited_at";

function mapProject(row: ProjectRow): BasecampProject {
  return {
    id: row.id,
    basecampId: row.basecamp_id,
    name: row.name,
    description: row.description,
    purpose: row.purpose,
    status: row.status,
    url: row.url,
    appUrl: row.app_url,
    isAiRelevant: row.is_ai_relevant,
    manualVisibility: row.manual_visibility,
    lastActiveAt: row.last_active_at,
    ingestedAt: row.ingested_at,
  };
}

function mapRecording(row: RecordingRow): BasecampRecording {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    title: row.title,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    url: row.url,
    postedAt: row.posted_at,
    editedAt: row.edited_at,
  };
}

function shouldShow(p: BasecampProject, aiOnly: boolean): boolean {
  if (p.manualVisibility === "hide") return false;
  if (p.manualVisibility === "show") return true;
  if (!aiOnly) return true;
  return p.isAiRelevant;
}

export async function listBasecampProjects(opts?: {
  aiOnly?: boolean;
}): Promise<BasecampProject[]> {
  const aiOnly = opts?.aiOnly ?? false;

  if (isMock) {
    return [...mockBasecampProjects]
      .filter((p) => shouldShow(p, aiOnly))
      .sort((a, b) =>
        (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""),
      );
  }

  const { data, error } = await supabase
    .from("basecamp_projects")
    .select(PROJECT_SELECT)
    .order("last_active_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => mapProject(row as ProjectRow))
    .filter((p) => shouldShow(p, aiOnly));
}

export async function listBasecampActivity(opts?: {
  aiOnly?: boolean;
  limit?: number;
}): Promise<BasecampProjectWithActivity[]> {
  const limit = opts?.limit ?? 4;
  const aiOnly = opts?.aiOnly ?? false;

  const projects = await listBasecampProjects({ aiOnly });
  if (projects.length === 0) return [];

  if (isMock) {
    return projects.map((p) => ({
      ...p,
      recentActivity: mockBasecampRecordings
        .filter((r) => r.projectId === p.id)
        .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))
        .slice(0, limit),
    }));
  }

  const projectIds = projects.map((p) => p.id);
  // We pull the most recent ~limit*projects rows in one query then group in
  // JS. Cheaper than N round-trips and good enough for ~30 projects × 4 each.
  const { data, error } = await supabase
    .from("basecamp_recordings")
    .select(RECORDING_SELECT)
    .in("project_id", projectIds)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit * projectIds.length);
  if (error) throw new Error(error.message);

  const byProject = new Map<string, BasecampRecording[]>();
  for (const raw of data ?? []) {
    const rec = mapRecording(raw as RecordingRow);
    const bucket = byProject.get(rec.projectId) ?? [];
    if (bucket.length < limit) bucket.push(rec);
    byProject.set(rec.projectId, bucket);
  }

  return projects.map((p) => ({
    ...p,
    recentActivity: byProject.get(p.id) ?? [],
  }));
}

/** Editor/admin-only override for whether a project shows up in /team. */
export async function setBasecampProjectVisibility(
  projectId: string,
  visibility: "show" | "hide" | null,
): Promise<BasecampProject> {
  if (isMock) {
    const target = mockBasecampProjects.find((p) => p.id === projectId);
    if (!target) throw new Error("Project not found");
    target.manualVisibility = visibility;
    return target;
  }

  const { data, error } = await supabase.rpc("set_basecamp_project_visibility", {
    p_project_id: projectId,
    p_visibility: visibility,
  });
  if (error) throw new Error(error.message);
  return mapProject(data as ProjectRow);
}

export interface BasecampWorkspaceStatus {
  configured: boolean;
  accountName: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

export async function getBasecampWorkspaceStatus(): Promise<BasecampWorkspaceStatus> {
  if (isMock) {
    return {
      configured: true,
      accountName: "Scio (mock)",
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "ok",
    };
  }

  const { data, error } = await supabase
    .from("basecamp_workspaces")
    .select("account_name,last_full_sync_at,last_full_sync_status")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return {
      configured: false,
      accountName: null,
      lastSyncAt: null,
      lastSyncStatus: null,
    };
  }
  return {
    configured: true,
    accountName: (data as { account_name: string | null }).account_name,
    lastSyncAt: (data as { last_full_sync_at: string | null }).last_full_sync_at,
    lastSyncStatus: (data as { last_full_sync_status: string | null }).last_full_sync_status,
  };
}

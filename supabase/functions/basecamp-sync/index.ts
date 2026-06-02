/**
 * Basecamp incremental sync.
 *
 * Runs every hour via pg_cron (see 20260101000018_basecamp_cron.sql) or on
 * demand via a service-role POST. For each configured workspace:
 *   1. Refresh the access token (Vault refresh_token → Launchpad → access).
 *   2. List active + archived projects, upsert into `basecamp_projects` with
 *      AI-relevance computed against the workspace `ai_keywords`.
 *   3. Pull recent recordings (Message, Comment, Todo, Todolist,
 *      Schedule::Entry, Document, Question::Answer) sorted by `updated_at` desc
 *      and upsert into `basecamp_recordings`.
 *
 * Phase 1 is read-only and incremental: we always upsert, never delete. A
 * project that disappears from Basecamp is just left as-is — we can layer
 * tombstoning on later when we have a use case for it.
 *
 * verify_jwt is intentionally false: the function is reachable only by the
 * service role (Authorization: Bearer SERVICE_ROLE_KEY) or by the cron
 * trigger which uses the same key.
 */
import { createClient } from "@supabase/supabase-js";
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";
import {
  BasecampEndpoints,
  createBasecampClient,
  htmlToExcerpt,
  isAiRelevant,
  recordingKind,
  refreshAccessToken,
  type BasecampOAuthConfig,
  type BasecampProject,
  type BasecampRecording,
} from "../_shared/basecamp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLIENT_ID = Deno.env.get("BASECAMP_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("BASECAMP_CLIENT_SECRET") ?? "";
const REDIRECT_URI = Deno.env.get("BASECAMP_REDIRECT_URI") ?? "";
const USER_AGENT = Deno.env.get("BASECAMP_USER_AGENT") ?? "AI-Academy/0.1";

// Basecamp's /projects/recordings.json endpoint accepts exactly ONE `type`
// per request — a comma-separated list returns 400. We fetch each type
// separately and merge the results.
const RECORDING_TYPES = [
  "Message",
  "Comment",
  "Todo",
  "Todolist",
  "Schedule::Entry",
  "Document",
  "Question::Answer",
];

const RECORDINGS_MAX_PAGES = Number(
  Deno.env.get("BASECAMP_RECORDINGS_MAX_PAGES") ?? "5",
);

const cfg: BasecampOAuthConfig = {
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  userAgent: USER_AGENT,
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface WorkspaceRow {
  id: string;
  account_id: string;
  account_name: string | null;
  vault_secret_name: string;
  ai_keywords: string[];
}

interface SyncSummary {
  workspaces: number;
  projects_upserted: number;
  recordings_upserted: number;
  errors: Array<{ workspace?: string; message: string }>;
}

async function readRefreshToken(secretName: string): Promise<string> {
  // We use the helper RPC that ships in setup-cron-secrets.sql so this function
  // doesn't need direct vault.* schema access.
  const { data, error } = await supabase.rpc("vault_read_secret_by_name", {
    p_name: secretName,
  });
  if (error) throw new Error(`vault_read_secret_by_name(${secretName}): ${error.message}`);
  if (!data) throw new Error(`Vault secret "${secretName}" not set — run /basecamp-auth?action=start first.`);
  return data as string;
}

async function syncWorkspace(workspace: WorkspaceRow, summary: SyncSummary): Promise<void> {
  const refreshToken = await readRefreshToken(workspace.vault_secret_name);
  const tokens = await refreshAccessToken(cfg, refreshToken);

  const client = createBasecampClient({
    accessToken: tokens.access_token,
    accountId: workspace.account_id,
    userAgent: USER_AGENT,
  });

  // ---------- Projects (active + archived) -------------------------------
  const [active, archived] = await Promise.all([
    client.getAllPages<BasecampProject>(BasecampEndpoints.projects(), { maxPages: 5 }),
    client.getAllPages<BasecampProject>(BasecampEndpoints.archivedProjects(), { maxPages: 5 }),
  ]);
  const allProjects = [...active, ...archived];

  // Map basecamp project id → our internal uuid, so we can FK recordings later.
  const projectIdByBasecampId = new Map<number, string>();

  for (const p of allProjects) {
    const haystack = `${p.name} ${p.description ?? ""}`;
    const isAi = isAiRelevant(haystack, workspace.ai_keywords);

    const { data, error } = await supabase
      .from("basecamp_projects")
      .upsert(
        {
          workspace_id: workspace.id,
          basecamp_id: p.id,
          name: p.name,
          description: p.description,
          purpose: p.purpose,
          status: p.status,
          url: p.app_url ?? p.url,
          app_url: p.app_url,
          is_ai_relevant: isAi,
          last_active_at: p.updated_at ?? p.created_at ?? null,
          raw: p as unknown as Record<string, unknown>,
        },
        { onConflict: "workspace_id,basecamp_id" },
      )
      .select("id")
      .single();

    if (error) {
      summary.errors.push({
        workspace: workspace.account_name ?? workspace.account_id,
        message: `project ${p.id}: ${error.message}`,
      });
      continue;
    }
    if (data?.id) projectIdByBasecampId.set(p.id, data.id);
    summary.projects_upserted += 1;
  }

  // ---------- Recordings (cross-project unified feed) --------------------
  // One paginated call per recording type (the endpoint rejects multi-type
  // queries). A failure on one type is recorded but doesn't abort the others.
  const recordings: BasecampRecording[] = [];
  for (const recType of RECORDING_TYPES) {
    try {
      const page = await client.getAllPages<BasecampRecording>(
        BasecampEndpoints.recordings({
          type: recType,
          sort: "updated_at",
          direction: "desc",
        }),
        { maxPages: RECORDINGS_MAX_PAGES },
      );
      recordings.push(...page);
    } catch (e) {
      summary.errors.push({
        workspace: workspace.account_name ?? workspace.account_id,
        message: `recordings ${recType}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const recordingRows: Array<Record<string, unknown>> = [];
  for (const r of recordings) {
    const projectUuid = projectIdByBasecampId.get(r.bucket?.id);
    if (!projectUuid) continue; // recording belongs to a project we couldn't upsert

    const html = r.content ?? null;
    recordingRows.push({
      project_id: projectUuid,
      basecamp_id: r.id,
      kind: recordingKind(r.type),
      title: r.title ?? null,
      content_html: html,
      excerpt: htmlToExcerpt(html ?? r.excerpt ?? null),
      author_id: r.creator?.id ?? null,
      author_name: r.creator?.name ?? null,
      author_avatar_url: r.creator?.avatar_url ?? null,
      url: r.app_url ?? r.url ?? null,
      posted_at: r.created_at ?? null,
      edited_at: r.updated_at ?? null,
      raw: r as unknown as Record<string, unknown>,
    });
  }

  if (recordingRows.length > 0) {
    // Chunk to keep the request body small; Postgrest has a 1 MB default.
    const CHUNK = 200;
    for (let i = 0; i < recordingRows.length; i += CHUNK) {
      const slice = recordingRows.slice(i, i + CHUNK);
      const { error: upsertError, count } = await supabase
        .from("basecamp_recordings")
        .upsert(slice, {
          onConflict: "project_id,kind,basecamp_id",
          count: "exact",
        });
      if (upsertError) {
        summary.errors.push({
          workspace: workspace.account_name ?? workspace.account_id,
          message: `recordings batch ${i}: ${upsertError.message}`,
        });
        continue;
      }
      summary.recordings_upserted += count ?? slice.length;
    }
  }

  await supabase
    .from("basecamp_workspaces")
    .update({
      last_full_sync_at: new Date().toISOString(),
      last_full_sync_status: "ok",
    })
    .eq("id", workspace.id);
}

serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(req, 405, err("Method not allowed"));

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return jsonResponse(
      req,
      500,
      err("BASECAMP_CLIENT_ID / BASECAMP_CLIENT_SECRET not set."),
    );
  }

  const { data: workspaces, error } = await supabase
    .from("basecamp_workspaces")
    .select("id,account_id,account_name,vault_secret_name,ai_keywords");
  if (error) return jsonResponse(req, 500, err(error.message));

  const summary: SyncSummary = {
    workspaces: workspaces?.length ?? 0,
    projects_upserted: 0,
    recordings_upserted: 0,
    errors: [],
  };

  for (const w of workspaces ?? []) {
    try {
      await syncWorkspace(w as WorkspaceRow, summary);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      summary.errors.push({
        workspace: (w as WorkspaceRow).account_name ?? (w as WorkspaceRow).account_id,
        message,
      });
      await supabase
        .from("basecamp_workspaces")
        .update({
          last_full_sync_at: new Date().toISOString(),
          last_full_sync_status: `error: ${message}`.slice(0, 240),
        })
        .eq("id", (w as WorkspaceRow).id);
    }
  }

  return jsonResponse(req, 200, ok(summary));
});

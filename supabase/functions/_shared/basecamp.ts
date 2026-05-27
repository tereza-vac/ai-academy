/**
 * Shared helpers for talking to the Basecamp 4 API.
 *
 * Docs: https://github.com/basecamp/bc3-api (the Basecamp 4 product still uses
 * the bc3 API surface — same endpoints, same OAuth flow). All endpoints live
 * under https://3.basecampapi.com/{ACCOUNT_ID}/...
 *
 * Authentication uses 37signals' OAuth 2 flow:
 *   1. The admin authorises our app at https://launchpad.37signals.com/
 *      authorization/new?type=web_server&client_id=...&redirect_uri=...
 *   2. They land on our `basecamp-auth` callback with `?code=...`.
 *   3. We POST to https://launchpad.37signals.com/authorization/token to
 *      exchange the code for an access_token + refresh_token (90-day TTL on
 *      the refresh).
 *   4. We persist the refresh token in Supabase Vault and use it to mint
 *      access tokens at sync time.
 *
 * Rate limit: 50 requests / 10 seconds per access token, with proper
 * Retry-After headers. We honour them with exponential backoff.
 */

const LAUNCHPAD = "https://launchpad.37signals.com";
const BASECAMP_API_BASE = "https://3.basecampapi.com";

export interface BasecampOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Sent as the User-Agent header — Basecamp asks integrators to identify themselves. */
  userAgent: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export interface AuthorizationInfo {
  identity: { id: number; first_name: string; last_name: string; email_address: string };
  accounts: Array<{
    product: string; // e.g. "bcx" for Basecamp 4
    id: number;
    name: string;
    href: string;
    app_href: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/* Token endpoints                                                             */
/* -------------------------------------------------------------------------- */

export async function exchangeCodeForToken(
  cfg: BasecampOAuthConfig,
  code: string,
): Promise<OAuthTokenResponse> {
  const url =
    `${LAUNCHPAD}/authorization/token` +
    `?type=web_server` +
    `&client_id=${encodeURIComponent(cfg.clientId)}` +
    `&client_secret=${encodeURIComponent(cfg.clientSecret)}` +
    `&redirect_uri=${encodeURIComponent(cfg.redirectUri)}` +
    `&code=${encodeURIComponent(code)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "user-agent": cfg.userAgent },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basecamp token exchange failed (${res.status}): ${body}`);
  }
  return (await res.json()) as OAuthTokenResponse;
}

export async function refreshAccessToken(
  cfg: BasecampOAuthConfig,
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const url =
    `${LAUNCHPAD}/authorization/token` +
    `?type=refresh` +
    `&client_id=${encodeURIComponent(cfg.clientId)}` +
    `&client_secret=${encodeURIComponent(cfg.clientSecret)}` +
    `&redirect_uri=${encodeURIComponent(cfg.redirectUri)}` +
    `&refresh_token=${encodeURIComponent(refreshToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "user-agent": cfg.userAgent },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basecamp token refresh failed (${res.status}): ${body}`);
  }
  return (await res.json()) as OAuthTokenResponse;
}

/**
 * Returns the list of accounts/identities the access token is valid for.
 * Used right after `exchangeCodeForToken` to discover the numeric account id.
 */
export async function fetchAuthorization(
  cfg: BasecampOAuthConfig,
  accessToken: string,
): Promise<AuthorizationInfo> {
  const res = await fetch(`${LAUNCHPAD}/authorization.json`, {
    headers: {
      "user-agent": cfg.userAgent,
      authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basecamp authorization lookup failed (${res.status}): ${body}`);
  }
  return (await res.json()) as AuthorizationInfo;
}

/* -------------------------------------------------------------------------- */
/* Authenticated client                                                        */
/* -------------------------------------------------------------------------- */

export interface BasecampClient {
  /** GET a Basecamp endpoint (path or full URL) and parse JSON. */
  get<T>(pathOrUrl: string): Promise<T>;
  /** GET all pages of a paginated list endpoint. */
  getAllPages<T>(pathOrUrl: string, opts?: { maxPages?: number }): Promise<T[]>;
}

export function createBasecampClient(opts: {
  accessToken: string;
  accountId: string;
  userAgent: string;
}): BasecampClient {
  const { accessToken, accountId, userAgent } = opts;

  function resolveUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("http")) return pathOrUrl;
    const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${BASECAMP_API_BASE}/${accountId}${path}`;
  }

  async function rawGet(url: string): Promise<Response> {
    let attempt = 0;
    while (true) {
      const res = await fetch(url, {
        headers: {
          "user-agent": userAgent,
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
      });
      if (res.status !== 429 || attempt >= 4) return res;
      // Honour Retry-After if present, otherwise back off exponentially.
      const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt;
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      attempt += 1;
    }
  }

  async function get<T>(pathOrUrl: string): Promise<T> {
    const url = resolveUrl(pathOrUrl);
    const res = await rawGet(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Basecamp GET ${url} failed (${res.status}): ${body.slice(0, 240)}`);
    }
    return (await res.json()) as T;
  }

  async function getAllPages<T>(pathOrUrl: string, opts?: { maxPages?: number }): Promise<T[]> {
    const max = opts?.maxPages ?? 20;
    const out: T[] = [];
    let url: string | null = resolveUrl(pathOrUrl);
    let pages = 0;

    while (url && pages < max) {
      const res: Response = await rawGet(url);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Basecamp GET ${url} failed (${res.status}): ${body.slice(0, 240)}`);
      }
      const page = (await res.json()) as T[];
      if (Array.isArray(page)) out.push(...page);
      url = parseNextLink(res.headers.get("link"));
      pages += 1;
    }
    return out;
  }

  return { get, getAllPages };
}

/** Parse the RFC 5988 `Link` header used by Basecamp for pagination. */
function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  // Format: <https://3.basecampapi.com/.../recordings.json?page=2>; rel="next"
  for (const part of header.split(",")) {
    const m = part.trim().match(/^<([^>]+)>;\s*rel="next"/i);
    if (m) return m[1];
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Domain types                                                                */
/* -------------------------------------------------------------------------- */

export interface BasecampProject {
  id: number;
  name: string;
  description: string | null;
  purpose: "topic" | "team" | string;
  status: "active" | "archived" | "trashed" | string;
  created_at: string;
  updated_at: string;
  app_url?: string;
  url: string;
  bookmark_url?: string;
  dock?: BasecampDockEntry[];
}

export interface BasecampDockEntry {
  id: number;
  title: string;
  name: string; // 'message_board' | 'todoset' | 'schedule' | 'vault' | 'chat' | 'questionnaire' | ...
  enabled: boolean;
  position?: number;
  url: string;
  app_url?: string;
}

export interface BasecampRecording {
  id: number;
  type: string; // 'Message' | 'Comment' | 'Todo' | 'Todolist' | 'Schedule::Entry' | 'Document' | ...
  title?: string;
  content?: string;
  excerpt?: string;
  status?: string;
  visible_to_clients?: boolean;
  created_at?: string;
  updated_at?: string;
  app_url?: string;
  url?: string;
  bookmark_url?: string;
  comments_count?: number;
  parent?: { id: number; title?: string; type?: string };
  bucket: { id: number; name: string; type: string };
  creator?: BasecampPerson;
}

export interface BasecampPerson {
  id: number;
  attachable_sgid?: string;
  name: string;
  email_address?: string;
  personable_type?: string;
  title?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
  admin?: boolean;
  owner?: boolean;
  client?: boolean;
  employee?: boolean;
  time_zone?: string;
  avatar_url?: string;
  can_ping?: boolean;
  can_manage_projects?: boolean;
}

/** Endpoint helpers — keep call sites self-documenting. */
export const BasecampEndpoints = {
  projects(): string {
    return "/projects.json";
  },
  archivedProjects(): string {
    return "/projects.json?status=archived";
  },
  project(id: number): string {
    return `/projects/${id}.json`;
  },
  /**
   * Recordings is the unified activity-feed endpoint. `type` accepts a
   * comma-separated list. Common values:
   *   Message, Comment, Todo, Todolist, Schedule::Entry, Document,
   *   Vault, Question::Answer, Upload, Cloud::File, Inbox::Forward
   */
  recordings(opts: {
    type: string;
    bucket?: number; // a single project id, optional
    sort?: "created_at" | "updated_at";
    direction?: "desc" | "asc";
  }): string {
    const params = new URLSearchParams();
    params.set("type", opts.type);
    if (opts.bucket) params.set("bucket", String(opts.bucket));
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.direction) params.set("direction", opts.direction);
    return `/projects/recordings.json?${params.toString()}`;
  },
};

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */

const MAX_EXCERPT = 280;

/** Strip HTML and squash whitespace; capped at 280 chars. */
export function htmlToExcerpt(html: string | null | undefined): string | null {
  if (!html) return null;
  const stripped = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<\/(p|div|li|h\d)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  if (stripped.length <= MAX_EXCERPT) return stripped;
  return stripped.slice(0, MAX_EXCERPT - 1).trimEnd() + "…";
}

/**
 * Map a Basecamp `type` (PascalCase / namespaced) into our `kind` enum value
 * stored in `basecamp_recordings.kind`.
 */
export function recordingKind(rawType: string): string {
  switch (rawType) {
    case "Message":             return "message";
    case "Comment":             return "comment";
    case "Todo":                return "todo";
    case "Todolist":            return "todolist";
    case "Schedule::Entry":     return "schedule_entry";
    case "Document":            return "document";
    case "Question::Answer":    return "question_answer";
    case "Cloud::File":         return "cloud_file";
    case "Upload":              return "upload";
    case "Vault":               return "vault";
    default:                    return rawType.toLowerCase().replace(/::/g, "_");
  }
}

/** True when `text` contains any of the AI keyword hints (case-insensitive). */
export function isAiRelevant(text: string, keywords: string[]): boolean {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return keywords.some((k) => k && haystack.includes(k.toLowerCase()));
}

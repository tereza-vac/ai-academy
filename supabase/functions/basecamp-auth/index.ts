/**
 * Basecamp OAuth callback handler.
 *
 * Flow:
 *   1. Admin opens (in a browser):
 *        GET /functions/v1/basecamp-auth?action=start
 *      We redirect to Launchpad with the right client_id / redirect_uri.
 *
 *   2. After they click "Authorise", Launchpad bounces them back to:
 *        GET /functions/v1/basecamp-auth?code=<one-time-code>
 *      We exchange the code for an access + refresh token, look up the
 *      account id, and:
 *        - upsert the row in `basecamp_workspaces`
 *        - write the refresh token into Supabase Vault under the configured
 *          secret name (default: `basecamp_refresh_token`).
 *      Then we render a tiny HTML success page.
 *
 * Required env vars (configured via `supabase secrets set`):
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - BASECAMP_CLIENT_ID
 *   - BASECAMP_CLIENT_SECRET
 *   - BASECAMP_REDIRECT_URI    (must match what's registered on Launchpad,
 *                               typically `<project-url>/functions/v1/basecamp-auth`)
 *   - BASECAMP_USER_AGENT      (e.g. "AI Academy (admin@scio.cz)")
 *
 * verify_jwt is intentionally false in supabase/config.toml: this endpoint is
 * the OAuth landing URL and runs without an Academy session.
 */
import { createClient } from "@supabase/supabase-js";
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";
import {
  exchangeCodeForToken,
  fetchAuthorization,
  type BasecampOAuthConfig,
} from "../_shared/basecamp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLIENT_ID = Deno.env.get("BASECAMP_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("BASECAMP_CLIENT_SECRET") ?? "";
const REDIRECT_URI = Deno.env.get("BASECAMP_REDIRECT_URI") ?? "";
const USER_AGENT = Deno.env.get("BASECAMP_USER_AGENT") ?? "AI-Academy/0.1";
const VAULT_SECRET_NAME =
  Deno.env.get("BASECAMP_VAULT_SECRET_NAME") ?? "basecamp_refresh_token";

const cfg: BasecampOAuthConfig = {
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  userAgent: USER_AGENT,
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function htmlResponse(req: Request, status: number, html: string): Response {
  // CORS isn't strictly needed (this is a browser-redirect endpoint) but the
  // shared handler.ts already adds the headers, so we just match its style.
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function startUrl(): string {
  const u = new URL("https://launchpad.37signals.com/authorization/new");
  u.searchParams.set("type", "web_server");
  u.searchParams.set("client_id", CLIENT_ID);
  u.searchParams.set("redirect_uri", REDIRECT_URI);
  return u.toString();
}

/** Stash the refresh token in Supabase Vault. Idempotent (delete + insert). */
async function persistRefreshToken(refreshToken: string): Promise<void> {
  // We use the vault.secrets RPC instead of direct table access so this works
  // identically on hosted projects and self-hosted Supabase. The vault schema
  // exposes `vault.create_secret(secret, name, description)` and an internal
  // update path; the simplest portable shape is "delete by name, then create".
  const description = "Basecamp 4 OAuth refresh token (used by basecamp-sync)";

  // Best-effort delete: ignore failures if the secret doesn't exist.
  await supabase.rpc("vault_delete_secret_by_name", {
    p_name: VAULT_SECRET_NAME,
  }).catch(() => undefined);

  const { error } = await supabase.rpc("vault_create_secret", {
    p_secret: refreshToken,
    p_name: VAULT_SECRET_NAME,
    p_description: description,
  });
  if (error) {
    // Fall back to a direct insert if the helper RPCs don't exist on this
    // project. We require the editor to have created them per setup docs;
    // surface a useful message either way.
    throw new Error(
      `Failed to write Basecamp refresh token to Supabase Vault. ` +
      `Make sure the vault helper RPCs from supabase/setup-cron-secrets.sql ` +
      `are installed. Underlying error: ${error.message}`,
    );
  }
}

serve(async (req) => {
  if (req.method !== "GET") return jsonResponse(req, 405, err("Method not allowed"));

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  // Configuration sanity check — without these the rest is meaningless.
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return htmlResponse(req, 500, `<!doctype html><meta charset="utf-8">
      <title>Basecamp setup</title>
      <body style="font-family:system-ui;padding:2rem;max-width:48rem">
      <h1>Basecamp integration is not configured.</h1>
      <p>Set <code>BASECAMP_CLIENT_ID</code>, <code>BASECAMP_CLIENT_SECRET</code> and
      <code>BASECAMP_REDIRECT_URI</code> via <code>supabase secrets set</code> and try again.</p>
      </body>`);
  }

  // ---- Step 1: bounce admin to Launchpad authorisation page -------------
  if (action === "start") {
    return Response.redirect(startUrl(), 302);
  }

  // ---- OAuth error returned by Launchpad --------------------------------
  if (oauthError) {
    return htmlResponse(req, 400, `<!doctype html><meta charset="utf-8">
      <title>Basecamp authorisation failed</title>
      <body style="font-family:system-ui;padding:2rem;max-width:48rem">
      <h1>Basecamp said no.</h1>
      <p>Error: <code>${oauthError}</code></p>
      <p><a href="?action=start">Try again</a>.</p>
      </body>`);
  }

  // ---- No code yet: show a friendly landing page ------------------------
  if (!code) {
    return htmlResponse(req, 200, `<!doctype html><meta charset="utf-8">
      <title>Connect AI Academy to Basecamp</title>
      <body style="font-family:system-ui;padding:2rem;max-width:48rem;line-height:1.5">
      <h1>Connect AI Academy to Basecamp</h1>
      <p>Click below and approve the integration with the Basecamp admin account
      whose projects you want to surface in the Academy.</p>
      <p><a href="?action=start" style="display:inline-block;padding:0.75rem 1.25rem;
      background:#1d63ed;color:white;text-decoration:none;border-radius:0.5rem">
      Authorise with Basecamp</a></p>
      <p style="color:#666;font-size:0.875rem">You'll be redirected back here once
      authorisation is complete. The refresh token is stored encrypted in Supabase
      Vault — never in the browser.</p>
      </body>`);
  }

  // ---- Step 2: exchange the code, look up account, persist --------------
  try {
    const tokens = await exchangeCodeForToken(cfg, code);
    const auth = await fetchAuthorization(cfg, tokens.access_token);

    // We expect exactly one Basecamp 4 ("bcx") account. If the admin owns
    // multiple, we just take the first — multi-account is a Phase-2 nicety.
    const account = auth.accounts.find((a) => a.product === "bcx") ?? auth.accounts[0];
    if (!account) {
      throw new Error("No Basecamp 4 account is reachable for the authorising user.");
    }

    await persistRefreshToken(tokens.refresh_token);

    const { error: upsertError } = await supabase
      .from("basecamp_workspaces")
      .upsert(
        {
          account_id: String(account.id),
          account_name: account.name,
          vault_secret_name: VAULT_SECRET_NAME,
        },
        { onConflict: "account_id" },
      );
    if (upsertError) throw upsertError;

    return htmlResponse(req, 200, `<!doctype html><meta charset="utf-8">
      <title>Basecamp connected</title>
      <body style="font-family:system-ui;padding:2rem;max-width:48rem;line-height:1.5">
      <h1>✓ Basecamp connected</h1>
      <p>Account <strong>${escapeHtml(account.name)}</strong> (id <code>${account.id}</code>)
      is now linked to AI Academy.</p>
      <p>The first sync runs on the next cron tick (within an hour), or you can
      trigger it manually:</p>
      <pre style="background:#f4f4f4;padding:1rem;border-radius:0.5rem;overflow:auto">
curl -X POST -H "Authorization: Bearer $SERVICE_ROLE_KEY" \\
  ${escapeHtml(SUPABASE_URL)}/functions/v1/basecamp-sync</pre>
      <p>You can close this tab.</p>
      </body>`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[basecamp-auth] callback failed:", message);
    return htmlResponse(req, 500, `<!doctype html><meta charset="utf-8">
      <title>Basecamp connection failed</title>
      <body style="font-family:system-ui;padding:2rem;max-width:48rem">
      <h1>Basecamp connection failed.</h1>
      <p>Error: <code>${escapeHtml(message)}</code></p>
      <p><a href="?action=start">Try again</a> or check the function logs.</p>
      </body>`);
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Silence "ok is unused" — the helper is exported by handler.ts for parity with
// the rest of the codebase but this function returns HTML directly.
void ok;

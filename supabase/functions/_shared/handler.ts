/**
 * Minimal handler wrapper for AI Academy edge functions.
 *
 * Mirrors the shape used in `sciobot-next` but without the custom JWT bits —
 * we lean on Supabase Auth (or `verify_jwt = false` in `config.toml`).
 */
import { getCorsHeaders, handleCorsPreflight } from "./cors.ts";

type Handler = (req: Request) => Response | Promise<Response>;

export function serve(handler: Handler): void {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return handleCorsPreflight(req);
    try {
      return await handler(req);
    } catch (error) {
      console.error("[handler] Unhandled error:", error);
      return jsonResponse(req, 500, { error: "Internal server error" });
    }
  });
}

export function jsonResponse(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function ok<T>(data: T) {
  return { data, error: null as null };
}

export function err(message: string) {
  return { data: null, error: message };
}

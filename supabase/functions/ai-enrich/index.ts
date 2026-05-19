/**
 * AI enrichment edge function.
 *
 * Single endpoint that dispatches by `action` so the rest of the platform has
 * exactly one HTTP surface to hit:
 *
 *   POST /functions/v1/ai-enrich
 *   { "action": "summarize",    "payload": { "url": "...", "title": "...", "rawText": "..." } }
 *   { "action": "embed",        "payload": { "text": "..." } }
 *   { "action": "generateQuiz", "payload": { "topicTitle": "...", "topicBody": "...", "count": 5 } }
 *
 * Implementation switches between `mockEnrichment` and `openAIEnrichment`
 * inside `_shared/ai.ts`. Wire OpenAI there — this file stays untouched.
 */
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";
import { pickEnrichment } from "../_shared/ai.ts";

const enrichment = pickEnrichment();

serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(req, 405, err("Method not allowed"));

  let body: { action?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, err("Invalid JSON body"));
  }

  const action = body.action;
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  try {
    switch (action) {
      case "summarize": {
        const out = await enrichment.summarizeResource({
          url: String(payload.url ?? ""),
          title: String(payload.title ?? ""),
          rawText: typeof payload.rawText === "string" ? payload.rawText : undefined,
        });
        return jsonResponse(req, 200, ok(out));
      }
      case "embed": {
        const out = await enrichment.embedText({ text: String(payload.text ?? "") });
        return jsonResponse(req, 200, ok(out));
      }
      case "generateQuiz": {
        const out = await enrichment.generateQuiz({
          topicTitle: String(payload.topicTitle ?? ""),
          topicBody: String(payload.topicBody ?? ""),
          count: typeof payload.count === "number" ? payload.count : undefined,
        });
        return jsonResponse(req, 200, ok(out));
      }
      default:
        return jsonResponse(req, 400, err(`Unknown action: ${action ?? "<missing>"}`));
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse(req, 500, err(message));
  }
});

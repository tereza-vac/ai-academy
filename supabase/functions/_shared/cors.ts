export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, user-agent",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, PATCH, DELETE",
};

export function getCorsHeaders(_request?: Request): typeof corsHeaders {
  return corsHeaders;
}

export function handleCorsPreflight(_request?: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

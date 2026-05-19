import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { API_CONFIG } from "@/config/api";

/**
 * Browser Supabase client.
 *
 * Auth tokens are managed by Supabase (`persistSession: true`) — we use Supabase Auth
 * directly rather than a custom JWT, so this stays simple.
 */
export const supabase: SupabaseClient = createClient(
  API_CONFIG.SUPABASE_URL,
  API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Public URL helper for files in a Supabase Storage bucket. */
export function getStorageUrl(bucket: string, path: string): string {
  return `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

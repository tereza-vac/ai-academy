/**
 * Single switch that decides whether services read from mock data or from Supabase.
 *
 * When `VITE_SUPABASE_URL` is set AND we are not in mock mode, services should
 * hit Supabase. Otherwise we fall back to bundled mocks so the app boots without
 * any backend dependency.
 *
 * The default is "mock" so the MVP works on `npm run dev` out of the box.
 */
export type DataMode = "mock" | "supabase";

const FORCED = (import.meta.env.VITE_DATA_MODE as DataMode | undefined) ?? undefined;
const HAS_SUPABASE = Boolean(import.meta.env.VITE_SUPABASE_URL);

export const dataMode: DataMode = FORCED ?? (HAS_SUPABASE ? "supabase" : "mock");

export const isMock = dataMode === "mock";

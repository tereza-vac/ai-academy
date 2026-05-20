import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isMock } from "@/lib/dataMode";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/loading-screen";

/**
 * Gates routes behind Supabase Auth.
 *
 * - In mock mode (no Supabase configured) auth is a no-op so the app works
 *   out of the box.
 * - When loading, render a skeleton instead of flashing the login page.
 * - When unauthenticated, redirect to `/login` and remember where we came from.
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isMock) return <Outlet />;

  if (isLoading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

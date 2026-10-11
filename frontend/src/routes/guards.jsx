import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Feedback";

function FullPageLoading() {
  return <div className="flex min-h-screen items-center justify-center"><Spinner label="Loading your session" /></div>;
}

/** Signed-in users only. The server still enforces this; this just gives a good UX. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Admin pages. Hiding them here is cosmetic; every admin API call is checked on the server. */
export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  if (user.role !== "admin") return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

/** Login/register pages bounce signed-in users to their dashboard. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

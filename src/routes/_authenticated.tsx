import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated")({
  component: Guard,
});

function Guard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <span className="animate-pulse text-2xl">🏡 Even het huis openen...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  return <Outlet />;
}

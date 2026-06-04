import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

export function Protected({
  children,
  role,
}: {
  children: ReactNode;
  role?: AppRole;
}) {
  const { user, role: userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { mode: "login" } });
    } else if (role && userRole && userRole !== role) {
      navigate({ to: userRole === "lecturer" ? "/lecturer" : "/student" });
    }
  }, [loading, user, userRole, role, navigate]);

  if (loading || !user || (role && userRole !== role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
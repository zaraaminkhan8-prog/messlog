import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function AppShell({
  role,
  title,
  children,
}: {
  role: AppRole;
  title: string;
  children: ReactNode;
}) {
  const { user, role: userRole, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (userRole && userRole !== role) {
      navigate({ to: userRole === "staff" ? "/staff" : "/dashboard" });
    }
  }, [user, userRole, loading, role, navigate]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-hero)] text-primary-foreground font-display text-sm font-bold">
                M
              </div>
              <span className="font-display text-lg font-semibold">MessLog</span>
            </Link>
            <span className="hidden rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground sm:inline">
              {role}
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            {role === "student" && (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  activeProps={{ className: "text-sm font-semibold text-foreground" }}
                >
                  Dashboard
                </Link>
                <Link
                  to="/log"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  activeProps={{ className: "text-sm font-semibold text-foreground" }}
                >
                  Log meal
                </Link>
              </>
            )}
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.full_name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}

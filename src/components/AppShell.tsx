import { Link, useNavigate } from "@tanstack/react-router";
import { messStore, useMessStore, type Role } from "@/lib/mess-store";
import { Button } from "@/components/ui/button";
import { useEffect, type ReactNode } from "react";

export function AppShell({
  role,
  title,
  children,
}: {
  role: Role;
  title: string;
  children: ReactNode;
}) {
  const user = useMessStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/" });
    else if (user.role !== role) navigate({ to: `/${user.role}` as "/student" });
  }, [user, role, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-hero)] text-primary-foreground font-display text-sm font-bold">
                M
              </div>
              <span className="font-display text-lg font-semibold">MessWise</span>
            </Link>
            <span className="hidden rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground sm:inline">
              {role}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                messStore.logout();
                navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          </div>
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

export function formatINR(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(n)}`;
}

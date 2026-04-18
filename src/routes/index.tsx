import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MessLog — GIKI mess meal logger" },
      { name: "description", content: "Log your GIKI mess meals fairly. Sign in to opt in for breakfast or lunch+dinner." },
      { property: "og:title", content: "MessLog — GIKI mess meal logger" },
      { property: "og:description", content: "Stop paying for meals you don't eat at GIKI mess. Sign in to get started." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && role) navigate({ to: role === "staff" ? "/staff" : "/dashboard" });
  }, [user, role, loading, navigate]);

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground font-display text-lg font-bold">
            M
          </div>
          <span className="font-display text-xl font-semibold">MessLog</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" size="sm">Sign in</Button>
        </Link>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-16 text-center">
        <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Built for GIKI students
        </span>
        <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
          Welcome to <em className="text-primary">MessLog</em>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          The fair way to handle your GIKI mess meals. Sign in or create an account to start logging — pricing, menus and your dashboard unlock once you're in.
        </p>

        <Card className="mt-10 w-full rounded-3xl border-border/60 p-8 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold">Get started</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            New here? Create an account with your registration number. Already have one? Just log in.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">Sign up</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Log in</Button>
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { messStore, useMessStore } from "@/lib/mess-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MessWise — Fair mess billing for students" },
      {
        name: "description",
        content:
          "Skip a meal, get refunded. Release it to guards, share the cost. A fair, transparent mess wallet for universities.",
      },
      { property: "og:title", content: "MessWise — Fair mess billing for students" },
      {
        property: "og:description",
        content: "Stop paying for meals you don't eat. Transparent wallet, instant refunds.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const current = useMessStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

  useEffect(() => {
    if (current) {
      navigate({ to: `/${current.role}` as "/student" });
    }
  }, [current, navigate]);

  const [email, setEmail] = useState("aarav@uni.edu");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const u = messStore.login(email, password);
    if (!u) return setError("Invalid credentials. Try a demo account below.");
    navigate({ to: `/${u.role}` as "/student" });
  }

  function quickLogin(em: string) {
    setEmail(em);
    setPassword("demo");
    const u = messStore.login(em, "demo");
    if (u) navigate({ to: `/${u.role}` as "/student" });
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground font-display text-lg font-bold">
            M
          </div>
          <span className="font-display text-xl font-semibold">MessWise</span>
        </div>
        <a
          href="#login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign in
        </a>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> University mess, redesigned
          </span>
          <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
            Stop paying for meals <em className="text-primary">you didn't eat.</em>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Mess in by default. Skip 2 hours early to get <b>90% back</b>. Release a meal at
            mess time and a guard can claim it — you still get <b>40%</b> back.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat title="To student" value="40–90%" />
            <Stat title="To university" value="10%" />
            <Stat title="To guard" value="50% off meal" />
          </div>
        </div>

        <Card id="login" className="rounded-3xl border-border/60 p-8 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your university email. This demo runs locally.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="em">University email</Label>
              <Input id="em" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>
          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick demo logins
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <DemoChip label="Student" onClick={() => quickLogin("aarav@uni.edu")} />
              <DemoChip label="Guard" onClick={() => quickLogin("guard1@uni.edu")} />
              <DemoChip label="Admin" onClick={() => quickLogin("admin@uni.edu")} />
            </div>
          </div>
        </Card>
      </section>

      <section className="border-t border-border/60 bg-card/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
          <Step n="1" title="Mess in by default" body="Every meal slot is billed unless you opt out." />
          <Step n="2" title="Skip 2h early" body="90% refund hits your wallet instantly. 10% covers admin." />
          <Step n="3" title="Release at meal time" body="Guards claim it for 50% off. You get 40% back." />
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Built for fairer campus dining ·{" "}
        <Link to="/" className="underline-offset-2 hover:underline">
          MessWise
        </Link>
      </footer>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="font-display text-2xl font-semibold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </div>
  );
}

function DemoChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-accent/40"
    >
      {label} →
    </button>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
        {n}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

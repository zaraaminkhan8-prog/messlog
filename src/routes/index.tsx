import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SLOT_PRICE, formatINR } from "@/lib/mess";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MessLog — Log mess meals fairly" },
      { name: "description", content: "Opt in for breakfast, lunch & dinner before the deadline. Get 40% back when staff claim a meal you skipped." },
      { property: "og:title", content: "MessLog — Log mess meals fairly" },
      { property: "og:description", content: "Stop paying for meals you don't eat. Real-time meal logging tied to your bank balance." },
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

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Built for university hostels
          </span>
          <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
            Pay only for the meals <em className="text-primary">you actually log.</em>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Log meals before <b>10 AM</b> for today or after <b>10 PM</b> for tomorrow.
            Forgot to opt out? Release the meal — if staff claim it, you get <b>40%</b> back.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <PriceCard slot="Breakfast" price={SLOT_PRICE.breakfast} />
            <PriceCard slot="Lunch" price={SLOT_PRICE.lunch} />
            <PriceCard slot="Dinner" price={SLOT_PRICE.dinner} />
          </div>
          <div className="mt-8 flex gap-3">
            <Link to="/auth">
              <Button size="lg">Get started</Button>
            </Link>
          </div>
        </div>

        <Card className="rounded-3xl border-border/60 p-8 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 space-y-5">
            <Step n={1} title="Sign up with your reg. number" body="Pick student or staff. Your meal history and bank balance live in your account." />
            <Step n={2} title="Log meals in the open window" body="Before 10 AM or after 10 PM — you're locked in for that meal." />
            <Step n={3} title="Forgot to skip? Release it" body="Staff sees the released meal and can claim it for free. You get 40% refunded — otherwise 0%." />
            <Step n={4} title="Bank reminders" body="Dashboard nudges you to top up if your linked balance can't cover the month." />
          </ol>
        </Card>
      </section>
    </main>
  );
}

function PriceCard({ slot, price }: { slot: string; price: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="font-display text-2xl font-semibold text-primary">{formatINR(price)}</p>
      <p className="text-xs text-muted-foreground">{slot}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
        {n}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

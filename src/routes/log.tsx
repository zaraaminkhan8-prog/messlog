import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SLOT_LABEL, SLOT_ORDER, SLOT_PRICE, activeLoggingDate, formatINR, type Slot } from "@/lib/mess";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/log")({
  head: () => ({ meta: [{ title: "Log meals — MessLog" }] }),
  component: LogPage,
});

type Meal = {
  id: string;
  meal_date: string;
  slot: Slot;
  price: number;
  status: "logged" | "eaten" | "released" | "claimed" | "forfeited";
};

function LogPage() {
  return (
    <AppShell role="student" title="Log your meals">
      <Toaster richColors position="top-center" />
      <LogBody />
    </AppShell>
  );
}

function LogBody() {
  const { user } = useAuth();
  const [date, setDate] = useState<string | null>(null);
  const [existing, setExisting] = useState<Meal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setDate(activeLoggingDate());
  }, []);

  useEffect(() => {
    if (!user || !date) return;
    void load();
  }, [user?.id, date]);

  async function load() {
    if (!user || !date) return;
    const { data } = await supabase
      .from("meals")
      .select("id, meal_date, slot, price, status")
      .eq("student_id", user.id)
      .eq("meal_date", date);
    setExisting((data as Meal[]) ?? []);
  }

  async function logMeal(slot: Slot) {
    if (!user || !date) return;
    setBusy(slot);
    const price = SLOT_PRICE[slot];
    const { error } = await supabase.from("meals").insert({
      student_id: user.id,
      meal_date: date,
      slot,
      price,
      status: "logged",
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`${SLOT_LABEL[slot]} logged for ${date}`);
      await supabase.from("transactions").insert({
        student_id: user.id,
        amount: -price,
        note: `Logged ${slot} for ${date}`,
      });
    }
    await load();
    setBusy(null);
  }

  async function releaseMeal(meal: Meal) {
    setBusy(meal.id);
    const { error } = await supabase
      .from("meals")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("id", meal.id);
    if (error) toast.error(error.message);
    else toast.success("Meal released. Staff can now claim it.");
    await load();
    setBusy(null);
  }

  if (!date) {
    return (
      <Card className="rounded-3xl border-border/60 p-8 text-center">
        <h2 className="font-display text-2xl font-semibold">Logging window is closed</h2>
        <p className="mt-2 text-muted-foreground">
          You can log meals <b>before 10:00 AM</b> for today, or <b>after 10:00 PM</b> for tomorrow.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Come back later — meals you've already logged are listed in your dashboard.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 bg-[image:var(--gradient-hero)] p-6 text-primary-foreground">
        <p className="text-sm opacity-80">Logging window open</p>
        <p className="mt-1 font-display text-3xl font-semibold">For {date}</p>
        <p className="mt-2 text-sm opacity-80">
          Pick the meals you'll be eating. Locked in once you tap.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {SLOT_ORDER.map((slot) => {
          const e = existing.find((m) => m.slot === slot);
          return (
            <Card key={slot} className="rounded-2xl border-border/60 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold">{SLOT_LABEL[slot]}</p>
                <p className="font-display text-lg font-semibold text-primary">
                  {formatINR(SLOT_PRICE[slot])}
                </p>
              </div>
              <div className="mt-4">
                {!e ? (
                  <Button
                    onClick={() => logMeal(slot)}
                    className="w-full"
                    disabled={busy === slot}
                  >
                    {busy === slot ? "…" : "Log this meal"}
                  </Button>
                ) : e.status === "logged" ? (
                  <div className="space-y-2">
                    <p className="rounded-lg bg-primary/10 p-2 text-center text-xs font-medium text-primary">
                      ✓ Logged
                    </p>
                    <Button
                      onClick={() => releaseMeal(e)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy === e.id}
                    >
                      Release (40% back if claimed)
                    </Button>
                  </div>
                ) : e.status === "released" ? (
                  <p className="rounded-lg bg-accent/30 p-2 text-center text-xs font-medium text-accent-foreground">
                    Released — waiting for staff
                  </p>
                ) : e.status === "claimed" ? (
                  <p className="rounded-lg bg-[color:var(--success)]/15 p-2 text-center text-xs font-medium text-[color:var(--success)]">
                    Claimed — 40% refunded
                  </p>
                ) : (
                  <p className="rounded-lg bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                    {e.status}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

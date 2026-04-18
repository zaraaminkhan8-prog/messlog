import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  BUNDLE_LABEL,
  BUNDLE_ORDER,
  BUNDLE_PRICE,
  BUNDLE_SLOTS,
  SLOT_PRICE,
  activeLoggingDate,
  formatPKR,
  type BundleSlot,
  type Slot,
} from "@/lib/mess";
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

type BundleState = "none" | "logged" | "released" | "claimed" | "mixed";

function bundleState(meals: Meal[], slots: Slot[]): BundleState {
  const found = slots.map((s) => meals.find((m) => m.slot === s));
  if (found.every((m) => !m)) return "none";
  if (found.every((m) => m && m.status === "logged")) return "logged";
  if (found.every((m) => m && m.status === "released")) return "released";
  if (found.every((m) => m && m.status === "claimed")) return "claimed";
  return "mixed";
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

  async function logBundle(bundle: BundleSlot) {
    if (!user || !date) return;
    setBusy(bundle);
    const slots = BUNDLE_SLOTS[bundle];
    const rows = slots.map((slot) => ({
      student_id: user.id,
      meal_date: date,
      slot,
      price: SLOT_PRICE[slot],
      status: "logged" as const,
    }));
    const { error } = await supabase.from("meals").insert(rows);
    if (error) toast.error(error.message);
    else {
      toast.success(`${BUNDLE_LABEL[bundle]} logged for ${date}`);
      await supabase.from("transactions").insert(
        slots.map((slot) => ({
          student_id: user.id,
          amount: -SLOT_PRICE[slot],
          note: `Logged ${slot} for ${date}`,
        })),
      );
    }
    await load();
    setBusy(null);
  }

  async function releaseBundle(bundle: BundleSlot) {
    if (!user || !date) return;
    setBusy(bundle);
    const slots = BUNDLE_SLOTS[bundle];
    const ids = existing.filter((m) => slots.includes(m.slot) && m.status === "logged").map((m) => m.id);
    if (ids.length === 0) return setBusy(null);
    const { error } = await supabase
      .from("meals")
      .update({ status: "released", released_at: new Date().toISOString() })
      .in("id", ids);
    if (error) toast.error(error.message);
    else toast.success("Released. Staff can now claim it.");
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
          Pick what you'll eat. Lunch and dinner come as a single bundle.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {BUNDLE_ORDER.map((bundle) => {
          const slots = BUNDLE_SLOTS[bundle];
          const state = bundleState(existing, slots);
          return (
            <Card key={bundle} className="rounded-2xl border-border/60 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold">{BUNDLE_LABEL[bundle]}</p>
                <p className="font-display text-lg font-semibold text-primary">
                  {formatPKR(BUNDLE_PRICE[bundle])}
                </p>
              </div>
              {bundle === "lunch_dinner" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Lunch + Dinner combined — Rs 560 total. Cannot be opted separately.
                </p>
              )}
              <div className="mt-4">
                {state === "none" ? (
                  <Button
                    onClick={() => logBundle(bundle)}
                    className="w-full"
                    disabled={busy === bundle}
                  >
                    {busy === bundle ? "…" : "Log this meal"}
                  </Button>
                ) : state === "logged" ? (
                  <div className="space-y-2">
                    <p className="rounded-lg bg-primary/10 p-2 text-center text-xs font-medium text-primary">
                      ✓ Logged
                    </p>
                    <Button
                      onClick={() => releaseBundle(bundle)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy === bundle}
                    >
                      Release (40% back if claimed)
                    </Button>
                  </div>
                ) : state === "released" ? (
                  <p className="rounded-lg bg-accent/30 p-2 text-center text-xs font-medium text-accent-foreground">
                    Released — waiting for staff
                  </p>
                ) : state === "claimed" ? (
                  <p className="rounded-lg bg-[color:var(--success)]/15 p-2 text-center text-xs font-medium text-[color:var(--success)]">
                    Claimed — 40% refunded
                  </p>
                ) : (
                  <p className="rounded-lg bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                    Mixed status
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-border/60 p-6">
        <h2 className="font-display text-lg font-semibold">Today's mess menu pricing</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between"><span>Breakfast</span><span className="font-semibold">{formatPKR(SLOT_PRICE.breakfast)}</span></li>
          <li className="flex justify-between"><span>Lunch + Dinner (bundle)</span><span className="font-semibold">{formatPKR(BUNDLE_PRICE.lunch_dinner)}</span></li>
        </ul>
      </Card>
    </div>
  );
}

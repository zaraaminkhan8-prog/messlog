import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  bundleLoggingDate,
  bundleWindowLabel,
  formatPKR,
  isBundleWindowOpen,
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

function bundleState(meals: Meal[], slots: Slot[], date: string): BundleState {
  const found = slots.map((s) => meals.find((m) => m.slot === s && m.meal_date === date));
  if (found.every((m) => !m)) return "none";
  if (found.every((m) => m && m.status === "logged")) return "logged";
  if (found.every((m) => m && m.status === "released")) return "released";
  if (found.every((m) => m && m.status === "claimed")) return "claimed";
  return "mixed";
}

function LogBody() {
  const { user, profile, refreshProfile } = useAuth();
  const [existing, setExisting] = useState<Meal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const bundleDates = useMemo(() => {
    const map = {} as Record<BundleSlot, string>;
    for (const b of BUNDLE_ORDER) map[b] = bundleLoggingDate(b);
    return map;
  }, []);
  const dates = useMemo(() => Array.from(new Set(Object.values(bundleDates))), [bundleDates]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user?.id, dates.join(",")]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("meals")
      .select("id, meal_date, slot, price, status")
      .eq("student_id", user.id)
      .in("meal_date", dates);
    setExisting((data as Meal[]) ?? []);
  }

  async function logBundle(bundle: BundleSlot) {
    if (!user) return;
    setBusy(bundle);
    const date = bundleDates[bundle];
    const slots = BUNDLE_SLOTS[bundle];
    let firstError: string | null = null;
    for (const slot of slots) {
      const { error } = await supabase.rpc("log_meal", {
        _meal_date: date,
        _slot: slot,
        _price: SLOT_PRICE[slot],
      });
      if (error && !firstError) firstError = error.message;
    }
    if (firstError) toast.error(firstError);
    else toast.success(`${BUNDLE_LABEL[bundle]} logged for ${date}`);
    await Promise.all([load(), refreshProfile()]);
    setBusy(null);
  }

  async function cancelBreakfast(bundle: BundleSlot) {
    // Breakfast can be cancelled anytime, no surcharge — full refund (server-side).
    if (!user) return;
    setBusy(bundle);
    const date = bundleDates[bundle];
    const slots = BUNDLE_SLOTS[bundle];
    const meals = existing.filter((m) => slots.includes(m.slot) && m.meal_date === date && m.status === "logged");
    if (meals.length === 0) return setBusy(null);
    let firstError: string | null = null;
    for (const m of meals) {
      const { error } = await supabase.rpc("forfeit_meal", { _meal_id: m.id });
      if (error && !firstError) firstError = error.message;
    }
    if (firstError) toast.error(firstError);
    else toast.success("Cancelled — full refund.");
    await load();
    setBusy(null);
  }

  async function releaseBundle(bundle: BundleSlot) {
    if (!user) return;
    setBusy(bundle);
    const date = bundleDates[bundle];
    const slots = BUNDLE_SLOTS[bundle];
    const ids = existing
      .filter((m) => slots.includes(m.slot) && m.meal_date === date && m.status === "logged")
      .map((m) => m.id);
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

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 bg-[image:var(--gradient-hero)] p-6 text-primary-foreground">
        <p className="text-sm opacity-80">Logging is always open</p>
        <p className="mt-1 font-display text-2xl font-semibold">
          Lunch + Dinner cutoff is 2:30 PM — after that it rolls to tomorrow.
        </p>
        <p className="mt-2 text-sm opacity-80">
          Breakfast can be logged or cancelled anytime with no surcharge.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {BUNDLE_ORDER.map((bundle) => {
          const date = bundleDates[bundle];
          const slots = BUNDLE_SLOTS[bundle];
          const state = bundleState(existing, slots, date);
          const isBreakfast = bundle === "breakfast";
          return (
            <Card key={bundle} className="rounded-2xl border-border/60 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold">{BUNDLE_LABEL[bundle]}</p>
                <p className="font-display text-lg font-semibold text-primary">
                  {formatPKR(BUNDLE_PRICE[bundle])}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                For <b>{date}</b>
                {isBreakfast
                  ? " · log or cancel anytime, no surcharge"
                  : " · cutoff 2:30 PM"}
              </p>
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
                    {isBreakfast ? (
                      <Button
                        onClick={() => cancelBreakfast(bundle)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={busy === bundle}
                      >
                        Cancel (full refund)
                      </Button>
                    ) : (
                      <Button
                        onClick={() => releaseBundle(bundle)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={busy === bundle}
                      >
                        Release (50% back if claimed)
                      </Button>
                    )}
                  </div>
                ) : state === "released" ? (
                  <p className="rounded-lg bg-accent/30 p-2 text-center text-xs font-medium text-accent-foreground">
                    Released — waiting for staff
                  </p>
                ) : state === "claimed" ? (
                  <p className="rounded-lg bg-[color:var(--success)]/15 p-2 text-center text-xs font-medium text-[color:var(--success)]">
                    Claimed — 50% refunded
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
          <li className="flex justify-between"><span>Breakfast</span><span className="font-semibold">{formatPKR(BUNDLE_PRICE.breakfast)}</span></li>
          <li className="flex justify-between"><span>Lunch + Dinner (combined)</span><span className="font-semibold">{formatPKR(BUNDLE_PRICE.lunch_dinner)}</span></li>
        </ul>
      </Card>
    </div>
  );
}

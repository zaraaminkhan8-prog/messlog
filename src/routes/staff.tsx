import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SLOT_LABEL, formatINR, type Slot } from "@/lib/mess";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Available meals — MessLog Staff" }] }),
  component: StaffPage,
});

type ReleasedMeal = {
  id: string;
  meal_date: string;
  slot: Slot;
  price: number;
  student_id: string;
  released_at: string | null;
};

type ClaimedMeal = ReleasedMeal & { claimed_by: string };

function StaffPage() {
  return (
    <AppShell role="staff" title="Free meals available">
      <Toaster richColors position="top-center" />
      <StaffBody />
    </AppShell>
  );
}

function StaffBody() {
  const { user } = useAuth();
  const [released, setReleased] = useState<ReleasedMeal[]>([]);
  const [mine, setMine] = useState<ClaimedMeal[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, { full_name: string; registration_number: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel("released-meals")
      .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function load() {
    if (!user) return;
    const [{ data: rel }, { data: claimed }] = await Promise.all([
      supabase.from("meals").select("id, meal_date, slot, price, student_id, released_at").eq("status", "released").order("released_at", { ascending: false }),
      supabase.from("meals").select("id, meal_date, slot, price, student_id, released_at, claimed_by").eq("claimed_by", user.id).eq("status", "claimed").order("meal_date", { ascending: false }).limit(10),
    ]);
    const all = [...((rel as ReleasedMeal[]) ?? []), ...((claimed as ClaimedMeal[]) ?? [])];
    const ids = Array.from(new Set(all.map((m) => m.student_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, registration_number")
        .in("user_id", ids);
      const map: Record<string, { full_name: string; registration_number: string }> = {};
      (profs ?? []).forEach((p) => {
        map[p.user_id] = { full_name: p.full_name, registration_number: p.registration_number };
      });
      setProfilesById(map);
    }
    setReleased((rel as ReleasedMeal[]) ?? []);
    setMine((claimed as ClaimedMeal[]) ?? []);
  }

  async function claim(meal: ReleasedMeal) {
    if (!user) return;
    setBusy(meal.id);
    const { error } = await supabase.rpc("claim_meal", { _meal_id: meal.id });
    if (error) toast.error(error.message);
    else toast.success(`Claimed ${SLOT_LABEL[meal.slot]} on ${meal.meal_date} for ${formatINR(Number(meal.price) / 2)}`);
    await load();
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 bg-[image:var(--gradient-hero)] p-6 text-primary-foreground">
        <p className="text-sm opacity-80">Welcome, staff</p>
        <p className="mt-1 font-display text-3xl font-semibold">{released.length} meal{released.length === 1 ? "" : "s"} up for grabs</p>
        <p className="mt-2 text-sm opacity-80">
          Students released these meals. Claim one and head to the mess — it's yours, free.
        </p>
      </Card>

      <div className="grid gap-3">
        {released.length === 0 && (
          <Card className="rounded-2xl border-border/60 p-6 text-center text-muted-foreground">
            No meals available right now. Check back later.
          </Card>
        )}
        {released.map((m) => {
          const p = profilesById[m.student_id];
          return (
            <Card key={m.id} className="flex flex-col gap-3 rounded-2xl border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-lg font-semibold">
                  {SLOT_LABEL[m.slot]} · {m.meal_date}
                </p>
                <p className="text-xs text-muted-foreground">
                  Released by {p?.full_name ?? "student"} ({p?.registration_number ?? "—"}) ·
                  worth {formatINR(Number(m.price))}
                </p>
              </div>
              <Button onClick={() => claim(m)} disabled={busy === m.id}>
                {busy === m.id ? "…" : "Claim this meal"}
              </Button>
            </Card>
          );
        })}
      </div>

      {mine.length > 0 && (
        <Card className="rounded-3xl border-border/60 p-6">
          <h2 className="font-display text-xl font-semibold">Your recent claims</h2>
          <div className="mt-4 divide-y divide-border/60">
            {mine.map((m) => {
              const p = profilesById[m.student_id];
              return (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{SLOT_LABEL[m.slot]} · {m.meal_date}</p>
                    <p className="text-xs text-muted-foreground">From {p?.full_name ?? "student"}</p>
                  </div>
                  <p className="font-display text-sm font-semibold text-[color:var(--success)]">FREE</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

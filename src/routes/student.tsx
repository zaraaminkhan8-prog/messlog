import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, formatINR } from "@/components/AppShell";
import { messStore, useMessStore, SLOT_LABEL, type Meal } from "@/lib/mess-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "Student Dashboard — MessWise" }] }),
  component: StudentPage,
});

function StudentPage() {
  return (
    <AppShell role="student" title="Your mess wallet">
      <Toaster richColors position="top-center" />
      <StudentBody />
    </AppShell>
  );
}

function StudentBody() {
  const user = useMessStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const meals = useMessStore((s) =>
    s.meals.filter((m) => m.studentId === s.currentUserId).sort((a, b) =>
      a.slot.localeCompare(b.slot),
    ),
  );
  const transactions = useMessStore((s) =>
    s.transactions.filter((t) => t.userId === s.currentUserId).slice(0, 8),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="rounded-3xl border-border/60 bg-[image:var(--gradient-hero)] p-6 text-primary-foreground shadow-[var(--shadow-soft)] lg:col-span-1">
        <p className="text-sm opacity-80">Wallet balance</p>
        <p className="mt-2 font-display text-5xl font-semibold">
          {formatINR(user.walletBalance)}
        </p>
        <p className="mt-1 text-xs opacity-75">Auto-credited on the 1st of each month</p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
          <MiniStat label="Today's meals" value={String(meals.length)} />
          <MiniStat
            label="Active"
            value={String(meals.filter((m) => m.status === "messed-in").length)}
          />
        </div>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        <h2 className="font-display text-xl font-semibold">Today's meals</h2>
        {meals.map((m) => (
          <MealRow key={m.id} meal={m} />
        ))}
      </div>

      <Card className="rounded-3xl border-border/60 p-6 lg:col-span-3">
        <h2 className="font-display text-xl font-semibold">Recent activity</h2>
        <div className="mt-4 divide-y divide-border/60">
          {transactions.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No transactions yet.</p>
          )}
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{t.note}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.ts).toLocaleString()}
                </p>
              </div>
              <p
                className={`font-display text-lg font-semibold ${
                  t.amount >= 0 ? "text-[color:var(--success)]" : "text-destructive"
                }`}
              >
                {t.amount >= 0 ? "+" : ""}
                {formatINR(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3">
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="opacity-80">{label}</p>
    </div>
  );
}

function MealRow({ meal }: { meal: Meal }) {
  const [busy, setBusy] = useState(false);
  const time = messStore.mealTime(meal.slot);
  const minutesLeft = messStore.minutesUntilMeal(meal);
  const canEarly = minutesLeft >= 120 && meal.status === "messed-in";
  const canRelease =
    meal.status === "messed-in" && (minutesLeft < 120 || messStore.isDuringMealTime(meal));

  function handleCancel() {
    setBusy(true);
    const r = messStore.cancelMeal(meal.id);
    setBusy(false);
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
  }

  return (
    <Card className="flex flex-col gap-3 rounded-2xl border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-display text-lg font-semibold">{SLOT_LABEL[meal.slot]}</p>
          <StatusBadge status={meal.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {time.startH}:00 – {time.endH}:00 · {formatINR(meal.price)}
          {meal.claimedByGuardName && ` · claimed by ${meal.claimedByGuardName}`}
        </p>
      </div>
      <div className="flex gap-2">
        {canEarly && (
          <Button onClick={handleCancel} disabled={busy} variant="outline" size="sm">
            Skip (90% back)
          </Button>
        )}
        {canRelease && !canEarly && (
          <Button onClick={handleCancel} disabled={busy} size="sm">
            Release to guards
          </Button>
        )}
        {meal.status !== "messed-in" && (
          <span className="text-xs text-muted-foreground self-center">No action</span>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: Meal["status"] }) {
  const map: Record<Meal["status"], { label: string; cls: string }> = {
    "messed-in": { label: "Messed in", cls: "bg-primary/10 text-primary" },
    "cancelled-early": { label: "Skipped", cls: "bg-secondary text-secondary-foreground" },
    released: { label: "Released", cls: "bg-accent/30 text-accent-foreground" },
    claimed: { label: "Claimed", cls: "bg-[color:var(--success)]/15 text-[color:var(--success)]" },
    consumed: { label: "Eaten", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${v.cls}`}>
      {v.label}
    </span>
  );
}

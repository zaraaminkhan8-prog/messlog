import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, formatINR } from "@/components/AppShell";
import { messStore, useMessStore, SLOT_LABEL } from "@/lib/mess-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — MessWise" }] }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <AppShell role="admin" title="University overview">
      <Toaster richColors position="top-center" />
      <AdminBody />
    </AppShell>
  );
}

function AdminBody() {
  const users = useMessStore((s) => s.users);
  const guards = useMessStore((s) => s.guards);
  const meals = useMessStore((s) => s.meals);
  const transactions = useMessStore((s) => s.transactions);
  const smsLog = useMessStore((s) => s.smsLog);

  const uniRevenue = transactions
    .filter((t) => t.userId === "uni")
    .reduce((sum, t) => sum + t.amount, 0);
  const refundsToStudents = transactions
    .filter((t) => t.type === "refund-early" || t.type === "refund-claimed")
    .reduce((sum, t) => sum + t.amount, 0);
  const released = meals.filter((m) => m.status === "released");
  const claimed = meals.filter((m) => m.status === "claimed").length;

  function endOfDay() {
    const n = messStore.chargeMessedInMeals();
    toast.success(`Charged ${n} meals to wallets`);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="University revenue" value={formatINR(uniRevenue)} accent />
        <KPI label="Refunded to students" value={formatINR(refundsToStudents)} />
        <KPI label="Released now" value={String(released.length)} />
        <KPI label="Claimed by guards" value={String(claimed)} />
      </div>

      <Card className="rounded-3xl border-border/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Demo controls</h2>
            <p className="text-sm text-muted-foreground">
              Simulate end-of-day to charge un-cancelled meals, or reset all data.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={endOfDay} variant="outline">
              Run end-of-day charge
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                messStore.reset();
                toast.success("Demo data reset");
              }}
            >
              Reset demo
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Released meals</h2>
            <p className="text-sm text-muted-foreground">
              When a guard collects the meal, mark it claimed and pick the guard.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {released.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No released meals right now.
            </p>
          )}
          {released.map((m) => (
            <ReleasedRow key={m.id} mealId={m.id} />
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6">
        <h2 className="font-display text-lg font-semibold">SMS log to guards</h2>
        <p className="text-sm text-muted-foreground">
          (Demo) Each release sends an SMS to all {guards.length} guards on duty.
        </p>
        <div className="mt-3 max-h-72 divide-y divide-border/60 overflow-auto">
          {smsLog.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No SMS sent yet.</p>
          )}
          {smsLog.slice(0, 50).map((s) => (
            <div key={s.id} className="py-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {s.toName}{" "}
                  <span className="text-muted-foreground">· {s.toPhone}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.ts).toLocaleTimeString()}
                </p>
              </div>
              <p className="mt-1 rounded-lg bg-muted/60 p-2 text-xs">{s.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6">
        <h2 className="font-display text-lg font-semibold">Students</h2>
        <div className="mt-3 divide-y divide-border/60">
          {users
            .filter((u) => u.role === "student")
            .map((u) => (
              <div key={u.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <p className="font-display text-lg font-semibold text-primary">
                  {formatINR(u.walletBalance)}
                </p>
              </div>
            ))}
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6">
        <h2 className="font-display text-lg font-semibold">All transactions</h2>
        <div className="mt-3 max-h-96 divide-y divide-border/60 overflow-auto">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium">{t.userName}</p>
                <p className="text-xs text-muted-foreground">{t.note}</p>
              </div>
              <p
                className={`font-display font-semibold ${
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

function ReleasedRow({ mealId }: { mealId: string }) {
  const meal = useMessStore((s) => s.meals.find((m) => m.id === mealId));
  const guards = useMessStore((s) => s.guards);
  const [guardId, setGuardId] = useState<string>(guards[0]?.id ?? "");
  if (!meal) return null;

  function confirm() {
    if (!guardId) return toast.error("Pick a guard");
    const r = messStore.markMealClaimed(mealId, guardId);
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-display text-base font-semibold">
          {SLOT_LABEL[meal.slot]} · {meal.studentName}
        </p>
        <p className="text-xs text-muted-foreground">
          Guard pays {formatINR(Math.round(meal.price * 0.5))} at the mess · Student
          gets {formatINR(Math.round(meal.price * 0.4))} back
        </p>
      </div>
      <div className="flex gap-2">
        <Select value={guardId} onValueChange={setGuardId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Pick guard" />
          </SelectTrigger>
          <SelectContent>
            {guards.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={confirm}>
          Mark claimed
        </Button>
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card
      className={`rounded-2xl border-border/60 p-5 ${
        accent ? "bg-[image:var(--gradient-hero)] text-primary-foreground" : ""
      }`}
    >
      <p className={`text-xs uppercase tracking-wider ${accent ? "opacity-80" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </Card>
  );
}

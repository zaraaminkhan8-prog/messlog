import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SLOT_LABEL, formatINR, loggingWindowMessage } from "@/lib/mess";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MessLog" }] }),
  component: DashboardPage,
});

type Meal = {
  id: string;
  meal_date: string;
  slot: "breakfast" | "lunch" | "dinner";
  price: number;
  status: "logged" | "eaten" | "released" | "claimed" | "forfeited";
};

type Tx = { id: string; amount: number; note: string; created_at: string };

function DashboardPage() {
  return (
    <AppShell role="student" title="Your mess month">
      <Toaster richColors position="top-center" />
      <DashboardBody />
    </AppShell>
  );
}

function DashboardBody() {
  const { user, profile, refreshProfile } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  useEffect(() => {
    if (!user) return;
    void load();
    // Realtime subscriptions would be nice but a simple reload is fine for demo.
  }, [user?.id]);

  async function load() {
    if (!user) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const start = monthStart.toISOString().slice(0, 10);
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase.from("meals").select("id, meal_date, slot, price, status").eq("student_id", user.id).gte("meal_date", start).order("meal_date", { ascending: false }),
      supabase.from("transactions").select("id, amount, note, created_at").eq("student_id", user.id).order("created_at", { ascending: false }).limit(15),
    ]);
    setMeals((m as Meal[]) ?? []);
    setTxs((t as Tx[]) ?? []);
  }

  if (!profile) return <p className="text-muted-foreground">Loading your profile…</p>;

  const todayStr = new Date().toISOString().slice(0, 10);
  // Released meals that were never claimed by the time their date passes count as
  // regular billable meals — student gets no refund for an unclaimed release.
  const expiredReleased = meals.filter((m) => m.status === "released" && m.meal_date < todayStr);
  const billable = meals.filter(
    (m) => m.status === "logged" || m.status === "eaten" || (m.status === "released" && m.meal_date < todayStr),
  );
  const totalSpent = billable.reduce((s, m) => s + Number(m.price), 0);
  const refundedFromClaims = meals
    .filter((m) => m.status === "claimed")
    .reduce((s, m) => s + Number(m.price) * 0.5, 0);
  void expiredReleased;
  // Forfeited = cancelled breakfast (full refund) — already excluded from spend.
  const netCost = totalSpent - refundedFromClaims;
  const balance = Number(profile.bank_balance);
  const lowBalance = balance < netCost;

  async function saveBalance() {
    const n = Number(balanceInput);
    if (!Number.isFinite(n) || n < 0) return toast.error("Enter a valid amount");
    const { error } = await supabase
      .from("profiles")
      .update({ bank_balance: n })
      .eq("user_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Bank balance updated");
    setEditingBalance(false);
    await refreshProfile();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card
        className={`rounded-3xl border-border/60 p-6 lg:col-span-2 ${
          lowBalance ? "bg-destructive/10" : "bg-[image:var(--gradient-hero)] text-primary-foreground"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm ${lowBalance ? "text-destructive" : "opacity-80"}`}>
              Linked bank balance
            </p>
            <p className="mt-2 font-display text-5xl font-semibold">{formatINR(balance)}</p>
            <p className={`mt-1 text-xs ${lowBalance ? "text-destructive/90" : "opacity-75"}`}>
              {profile.registration_number} · {profile.full_name}
            </p>
          </div>
          {!editingBalance ? (
            <Button
              variant={lowBalance ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                setBalanceInput(String(balance));
                setEditingBalance(true);
              }}
            >
              Top up
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="w-28 bg-background text-foreground"
                type="number"
              />
              <Button size="sm" onClick={saveBalance}>Save</Button>
            </div>
          )}
        </div>
        {lowBalance && (
          <p className="mt-4 rounded-lg bg-destructive/15 p-3 text-sm font-medium text-destructive">
            ⚠ Your balance is below this month's bill of {formatINR(netCost)}. Replenish soon.
          </p>
        )}
      </Card>

      <Card className="rounded-3xl border-border/60 p-6">
        <p className="text-sm text-muted-foreground">This month</p>
        <p className="mt-2 font-display text-4xl font-semibold">{billable.length}</p>
        <p className="text-xs text-muted-foreground">meals logged</p>
        <div className="mt-4 space-y-1 text-sm">
          <Row label="Gross spent" value={formatINR(totalSpent)} />
          <Row label="Refunds (50%)" value={`-${formatINR(refundedFromClaims)}`} />
          <Row label="Net" value={formatINR(netCost)} bold />
        </div>
        <Link to="/log" className="mt-5 block">
          <Button className="w-full" size="sm">Log meals</Button>
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">{loggingWindowMessage()}</p>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 lg:col-span-2">
        <h2 className="font-display text-xl font-semibold">Recent meals</h2>
        <div className="mt-4 divide-y divide-border/60">
          {meals.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No meals logged this month yet.</p>
          )}
          {meals.slice(0, 12).map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">
                  {SLOT_LABEL[m.slot]} · {m.meal_date}
                </p>
                <StatusBadge status={m.status} />
              </div>
              <p className="font-display text-base font-semibold">{formatINR(m.price)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6">
        <h2 className="font-display text-xl font-semibold">Activity</h2>
        <div className="mt-4 divide-y divide-border/60">
          {txs.length === 0 && <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>}
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{t.note}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>
              <p
                className={`font-display text-sm font-semibold ${
                  Number(t.amount) >= 0 ? "text-[color:var(--success)]" : "text-destructive"
                }`}
              >
                {Number(t.amount) >= 0 ? "+" : ""}
                {formatINR(Number(t.amount))}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Meal["status"] }) {
  const map: Record<Meal["status"], { label: string; cls: string }> = {
    logged: { label: "Logged", cls: "bg-primary/10 text-primary" },
    eaten: { label: "Eaten", cls: "bg-muted text-muted-foreground" },
    released: { label: "Released (unclaimed — billed)", cls: "bg-accent/30 text-accent-foreground" },
    claimed: { label: "Claimed (50% back)", cls: "bg-[color:var(--success)]/15 text-[color:var(--success)]" },
    forfeited: { label: "Cancelled (full refund)", cls: "bg-destructive/15 text-destructive" },
  };
  const v = map[status];
  return (
    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${v.cls}`}>
      {v.label}
    </span>
  );
}

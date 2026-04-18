import { createFileRoute } from "@tanstack/react-router";
import { AppShell, formatINR } from "@/components/AppShell";
import { messStore, useMessStore, SLOT_LABEL } from "@/lib/mess-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/guard")({
  head: () => ({ meta: [{ title: "Guard Dashboard — MessWise" }] }),
  component: GuardPage,
});

function GuardPage() {
  return (
    <AppShell role="guard" title="Released meals">
      <Toaster richColors position="top-center" />
      <GuardBody />
    </AppShell>
  );
}

function GuardBody() {
  const user = useMessStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const released = useMessStore((s) => s.meals.filter((m) => m.status === "released"));
  const myClaims = useMessStore((s) =>
    s.meals.filter((m) => m.claimedByGuardId === s.currentUserId).slice(0, 6),
  );
  const txs = useMessStore((s) =>
    s.transactions.filter((t) => t.userId === s.currentUserId).slice(0, 6),
  );

  function claim(id: string) {
    const r = messStore.claimMeal(id, user.id);
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 bg-[image:var(--gradient-warm)] p-6">
        <p className="text-sm text-accent-foreground/80">Hey {user.name.split(" ")[0]} 👋</p>
        <p className="mt-2 font-display text-2xl font-semibold text-accent-foreground">
          {released.length} meal{released.length === 1 ? "" : "s"} available right now
        </p>
        <p className="mt-1 text-sm text-accent-foreground/80">
          Each one is 50% off — pay only half what the student would have.
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {released.length === 0 && (
          <Card className="rounded-2xl border-dashed border-border p-8 text-center text-sm text-muted-foreground md:col-span-2">
            No meals released yet. Check back during mess hours.
          </Card>
        )}
        {released.map((m) => (
          <Card
            key={m.id}
            className="flex items-center justify-between rounded-2xl border-border/60 p-4"
          >
            <div>
              <p className="font-display text-lg font-semibold">{SLOT_LABEL[m.slot]}</p>
              <p className="text-xs text-muted-foreground">
                {m.studentName} · You pay {formatINR(Math.round(m.price * 0.5))}
              </p>
            </div>
            <Button onClick={() => claim(m.id)} size="sm">
              Claim
            </Button>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/60 p-6">
          <h2 className="font-display text-lg font-semibold">Your recent claims</h2>
          <div className="mt-3 divide-y divide-border/60">
            {myClaims.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">Nothing claimed yet.</p>
            )}
            {myClaims.map((m) => (
              <div key={m.id} className="flex justify-between py-2 text-sm">
                <span>
                  {SLOT_LABEL[m.slot]} · {m.studentName}
                </span>
                <span className="text-muted-foreground">{formatINR(Math.round(m.price * 0.5))}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-3xl border-border/60 p-6">
          <h2 className="font-display text-lg font-semibold">Your payments</h2>
          <div className="mt-3 divide-y divide-border/60">
            {txs.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">No payments yet.</p>
            )}
            {txs.map((t) => (
              <div key={t.id} className="flex justify-between py-2 text-sm">
                <span>{t.note}</span>
                <span className="text-destructive">{formatINR(t.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { withdraw } from "@/lib/jobs.functions";
import { currency } from "@/lib/flowline";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDownToLine, Lock, TrendingUp, ArrowUpFromLine, ListOrdered } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payments")({
  component: Payments,
});

type Row = {
  id: string;
  amount_cents: number;
  kind: string;
  status: string;
  created_at: string;
  released_at: string | null;
  job_id: string | null;
};

function Payments() {
  const qc = useQueryClient();
  const doWithdraw = useServerFn(withdraw);
  const [range, setRange] = useState<"all" | "month" | "week" | "today">("month");

  const { data: rows } = useQuery<Row[]>({
    queryKey: ["payments"],
    queryFn: async () =>
      (await supabase
        .from("payments")
        .select("id, amount_cents, kind, status, created_at, released_at, job_id")
        .order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const now = new Date();
    const start = new Date(now);
    if (range === "today") start.setHours(0, 0, 0, 0);
    else if (range === "week") start.setDate(now.getDate() - 7);
    else if (range === "month") start.setMonth(now.getMonth() - 1);
    else return rows;
    return rows.filter((r) => new Date(r.created_at) >= start);
  }, [rows, range]);

  // Available balance excludes held (escrow) payments
  const balance = (rows ?? [])
    .filter((r) => r.status !== "held")
    .reduce((s, r) => s + r.amount_cents, 0);
  const heldTotal = (rows ?? [])
    .filter((r) => r.status === "held")
    .reduce((s, r) => s + r.amount_cents, 0);
  const earnings = filtered
    .filter((r) => r.kind === "payment" && r.status === "succeeded")
    .reduce((s, r) => s + r.amount_cents, 0);

  const held = filtered.filter((r) => r.status === "held");
  const succeeded = filtered.filter((r) => r.kind === "payment" && r.status === "succeeded");
  const withdrawals = filtered.filter((r) => r.kind === "withdrawal");

  const withdrawM = useMutation({
    mutationFn: (amount: number) => doWithdraw({ data: { amountCents: amount } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["earnings", "summary"] });
      toast.success("Withdrawn to bank");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <header className="mb-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Payments</h1>
          <p className="mt-1 text-muted-foreground">Track earnings, escrow, and withdraw to your bank.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={`Earnings (${range})`} value={currency(earnings)} />
          <StatCard label="In escrow" value={currency(heldTotal)} tone="warn" />
          <div className="min-w-[160px] rounded-3xl bg-primary p-4 text-primary-foreground shadow-brand">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Available</div>
            <div className="mt-1 font-display text-2xl font-bold">{currency(balance)}</div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 w-full rounded-xl bg-white/15 text-primary-foreground hover:bg-white/25"
              disabled={balance <= 0 || withdrawM.isPending}
              onClick={() => withdrawM.mutate(balance)}
            >
              <ArrowDownToLine className="mr-1 size-4" /> Withdraw
            </Button>
          </div>
        </div>
      </header>

      <div className="mb-4 flex gap-2">
        {(["today", "week", "month", "all"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
              range === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <Tabs defaultValue="earnings">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="earnings" className="rounded-xl gap-1.5"><TrendingUp className="size-3.5" /> Earnings</TabsTrigger>
          <TabsTrigger value="held" className="rounded-xl gap-1.5">
            <Lock className="size-3.5" /> Escrow
            {held.length > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[10px] font-black text-accent-foreground">{held.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="rounded-xl gap-1.5"><ArrowUpFromLine className="size-3.5" /> Withdrawals</TabsTrigger>
          <TabsTrigger value="all" className="rounded-xl gap-1.5"><ListOrdered className="size-3.5" /> All</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="mt-4">
          <PaymentList rows={succeeded} emptyText="No completed earnings in this range." />
        </TabsContent>
        <TabsContent value="held" className="mt-4">
          <div className="mb-3 rounded-2xl border-2 border-dashed border-accent/50 bg-accent/10 p-4 text-sm">
            <span className="font-bold text-accent-foreground">Held in escrow.</span>{" "}
            <span className="text-muted-foreground">Customers have paid these amounts. They land in your available balance the moment you mark the job done.</span>
          </div>
          <PaymentList rows={held} emptyText="No escrow payments right now." showHeld />
        </TabsContent>
        <TabsContent value="withdrawals" className="mt-4">
          <PaymentList rows={withdrawals} emptyText="No withdrawals in this range." />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <PaymentList rows={filtered} emptyText="No transactions in this range." />
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-xs text-muted-foreground">
        Withdrawals move funds out of your Flowline balance ledger. Wire real card capture and bank payouts by enabling Stripe Connect on the Plan tab (Pro).
      </p>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={`min-w-[160px] rounded-3xl border-2 p-4 ${tone === "warn" ? "border-accent/50 bg-accent/10" : "border-border bg-surface"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function PaymentList({ rows, emptyText, showHeld }: { rows: Row[]; emptyText: string; showHeld?: boolean }) {
  if (rows.length === 0) {
    return <div className="rounded-3xl border-2 border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="overflow-hidden rounded-3xl border-2 border-border bg-surface">
      {rows.map((r, i) => {
        const negative = r.amount_cents < 0;
        const isHeld = r.status === "held";
        const iconBg = isHeld
          ? "bg-accent/20 text-accent-foreground"
          : r.kind === "withdrawal"
            ? "bg-muted text-muted-foreground"
            : "bg-success/15 text-success";
        const label = isHeld ? "HELD" : r.kind === "withdrawal" ? "OUT" : "IN";
        return (
          <div key={r.id} className={`flex items-center gap-4 px-6 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
            <div className={`grid size-10 place-items-center rounded-xl text-[10px] font-black uppercase ${iconBg}`}>{label}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-bold capitalize">
                {r.kind}
                {isHeld && <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-accent-foreground">Escrow</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
                {showHeld && " · waiting for job completion"}
              </div>
            </div>
            <div className={`font-mono font-bold ${negative ? "text-muted-foreground" : isHeld ? "text-accent-foreground" : "text-success"}`}>
              {r.amount_cents > 0 ? "+" : ""}{currency(r.amount_cents)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

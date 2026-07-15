import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { withdraw } from "@/lib/jobs.functions";
import { currency } from "@/lib/flowline";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payments")({
  component: Payments;
});

function Payments() {
  const qc = useQueryClient();
  const doWithdraw = useServerFn(withdraw);
  const [range, setRange] = useState<"all" | "month" | "week" | "today">("month");

  const { data: rows } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await supabase.from("payments").select("id, amount_cents, kind, status, created_at, job_id").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const now = new Date();
    const start = new Date(now);
    if (range === "today") start.setHours(0, 0, 0, 0);
    else if (range === "week") start.setDate(now.getDate() - 7);
    else if (range === "month") start.setMonth(now.getMonth() - 1);
    else return rows;
    return rows.filter(r => new Date(r.created_at) >= start);
  }, [rows, range]);

  const balance = (rows ?? []).reduce((s, r) => s + r.amount_cents, 0);
  const earnings = filtered.filter(r => r.kind === "payment").reduce((s, r) => s + r.amount_cents, 0);

  const withdrawM = useMutation({
    mutationFn: (amount: number) => doWithdraw({ data: { amountCents: amount } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["earnings", "summary"] }); toast.success("Withdrawn to bank"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <header className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Payments</h1>
          <p className="mt-1 text-muted-foreground">Track earnings and withdraw to your bank.</p>
        </div>
        <div className="flex gap-3">
          <div className="min-w-[180px] rounded-3xl border-2 border-border bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Earnings ({range})</div>
            <div className="mt-1 font-display text-2xl font-bold">{currency(earnings)}</div>
          </div>
          <div className="min-w-[180px] rounded-3xl bg-primary p-4 text-primary-foreground shadow-brand">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Balance</div>
            <div className="mt-1 font-display text-2xl font-bold">{currency(balance)}</div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 w-full rounded-xl bg-white/15 text-primary-foreground hover:bg-white/25"
              disabled={balance <= 0 || withdrawM.isPending}
              onClick={() => withdrawM.mutate(balance)}
            >
              <ArrowDownToLine className="mr-1 size-4" /> Withdraw all
            </Button>
          </div>
        </div>
      </header>

      <div className="mb-4 flex gap-2">
        {(["today", "week", "month", "all"] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${range === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{r}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-border bg-surface">
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No transactions in this range.</div>}
        {filtered.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-4 px-6 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
            <div className={`grid size-10 place-items-center rounded-xl text-xs font-black uppercase ${r.kind === "withdrawal" ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"}`}>
              {r.kind === "withdrawal" ? "OUT" : "IN"}
            </div>
            <div className="flex-1">
              <div className="font-bold capitalize">{r.kind}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className={`font-mono font-bold ${r.amount_cents < 0 ? "text-muted-foreground" : "text-success"}`}>
              {r.amount_cents > 0 ? "+" : ""}{currency(r.amount_cents)}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Withdrawals here go straight to your Flowline balance ledger. Connect real payouts (Stripe Connect) in Settings to move money to a real bank account.
      </p>
    </div>
  );
}

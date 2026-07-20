import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/flowline";
import { Button } from "@/components/ui/button";
import { Droplet, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/pay/$jobId")({
  component: PayPage,
  head: () => ({
    meta: [
      { title: "Pay your invoice — Flowline" },
      { name: "description", content: "Securely pay your plumbing invoice." },
    ],
  }),
});

function PayPage() {
  const { jobId } = Route.useParams();
  const [paid, setPaid] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pay-info", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pay_info", { p_job_id: jobId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("submit_payment", {
        p_job_id: jobId,
        p_amount_cents: data!.amount_cents,
      });
      if (error) throw error;
    },
    onSuccess: () => { setPaid(true); refetch(); toast.success("Payment sent"); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <FullScreen>Loading invoice…</FullScreen>;
  if (!data) return <FullScreen>Invoice not found.</FullScreen>;

  const alreadyPaid = paid || data.already_paid;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-4">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand">
            <Droplet className="size-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Flowline</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <Lock className="size-3" /> Secure
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 lg:p-8">
        <div className="rounded-3xl border-2 border-border bg-surface p-6 lg:p-8">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invoice from</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{data.business_name}</h1>

          <div className="mt-6 rounded-2xl bg-surface-muted p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Work performed</div>
            <p className="mt-1 text-sm">{data.description}</p>
          </div>

          <div className="mt-6 flex items-baseline justify-between border-t-2 border-dashed border-border pt-6">
            <span className="font-bold">Total due</span>
            <span className="font-display text-4xl font-bold tracking-tight">{currency(data.amount_cents)}</span>
          </div>

          {alreadyPaid ? (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-success/10 p-4 text-success">
              <CheckCircle2 className="size-5" strokeWidth={2.5} />
              <div>
                <div className="font-bold">Payment received</div>
                <div className="text-xs opacity-80">Held safely until your plumber marks the job complete.</div>
              </div>
            </div>
          ) : (
            <>
              <Button
                onClick={() => pay.mutate()}
                disabled={pay.isPending || data.amount_cents <= 0}
                className="mt-6 w-full rounded-2xl bg-primary py-6 text-base font-bold text-primary-foreground shadow-brand"
              >
                {pay.isPending ? "Processing…" : `Pay ${currency(data.amount_cents)}`}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Your payment is held in escrow and only released once the work is confirmed done.
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by Flowline — the all-in-one workflow for plumbers.
        </p>
      </main>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">{children}</div>;
}

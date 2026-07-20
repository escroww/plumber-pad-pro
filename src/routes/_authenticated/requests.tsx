import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { acceptJob, declineJob } from "@/lib/jobs.functions";
import { analyzeJob } from "@/lib/ai.functions";
import { currency, loyaltyTier, urgencyLabel, initials } from "@/lib/flowline";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Inbox, Flame, CalendarClock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/requests")({
  component: Requests,
});

function Requests() {
  const qc = useQueryClient();
  const accept = useServerFn(acceptJob);
  const decline = useServerFn(declineJob);
  const analyze = useServerFn(analyzeJob);

  const { data: pending, isLoading } = useQuery({
    queryKey: ["jobs", "pending", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs")
        .select("id, description, ai_summary, urgency, suggested_price_cents, created_at, customer:customers(id,name,phone,address,lifetime_spend_cents,visit_count)")
        .eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const analyzedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!pending) return;
    const targets = pending.filter((j) => !j.ai_summary && !analyzedRef.current.has(j.id));
    if (targets.length === 0) return;
    (async () => {
      for (const j of targets) {
        analyzedRef.current.add(j.id);
        try {
          await analyze({ data: { jobId: j.id } });
        } catch (e) {
          console.warn("analyze failed", e);
        }
      }
      qc.invalidateQueries({ queryKey: ["jobs", "pending", "all"] });
    })();
  }, [pending, analyze, qc]);

  const declineM = useMutation({
    mutationFn: (jobId: string) => decline({ data: { jobId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); qc.invalidateQueries({ queryKey: ["pending-count"] }); toast.success("Declined"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Pending Requests</h1>
          <p className="mt-1 text-muted-foreground">Accept a job to schedule it. Decline to remove.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase text-primary">{pending?.length ?? 0} active</span>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && (!pending || pending.length === 0) && (
        <div className="rounded-3xl border-2 border-dashed border-border bg-surface p-12 text-center">
          <p className="font-display text-lg font-bold">All clear.</p>
          <p className="mt-1 text-sm text-muted-foreground">New requests will land here.</p>
        </div>
      )}

      <div className="space-y-4">
        {pending?.map((job, i) => {
          const cust = job.customer as { id: string; name: string; phone: string; address: string | null; lifetime_spend_cents: number; visit_count: number } | null;
          const tier = cust ? loyaltyTier(cust.lifetime_spend_cents ?? 0, cust.visit_count ?? 0) : loyaltyTier(0, 0);
          const urg = urgencyLabel(job.urgency);
          return (
            <div key={job.id} className="animate-in-up rounded-3xl border-2 border-border bg-surface p-6" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-full border-2 border-accent bg-accent/20 font-bold text-accent-foreground">{initials(cust?.name ?? "?")}</div>
                  <div>
                    <h3 className="font-bold">{cust?.name ?? "Unknown"}</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${tier.dot}`} /><span className="font-bold text-muted-foreground">{tier.label}</span></span>
                      {cust?.phone && <span className="font-mono text-muted-foreground">· {cust.phone}</span>}
                    </div>
                  </div>
                </div>
                <span className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase ${urg.cls}`}>{urg.label}</span>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">Request:</span> {job.description}
              </p>
              {cust?.address && <p className="mt-1 text-xs text-muted-foreground">{cust.address}</p>}

              {job.ai_summary && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
                  <p className="text-xs leading-relaxed">
                    <span className="font-black uppercase tracking-wider text-primary">AI · </span>
                    {job.ai_summary}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col items-stretch justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
                <div className="rounded-xl border border-border bg-surface-muted px-3 py-2 font-mono text-sm italic">
                  {job.suggested_price_cents ? `Suggested ${currency(job.suggested_price_cents)}` : "No estimate yet"}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => declineM.mutate(job.id)} disabled={declineM.isPending} className="rounded-2xl">
                    Decline
                  </Button>
                  <AcceptDialog jobId={job.id} suggested={job.suggested_price_cents ?? 0} onDone={() => { qc.invalidateQueries({ queryKey: ["jobs"] }); qc.invalidateQueries({ queryKey: ["pending-count"] }); }} accept={accept} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AcceptDialog({ jobId, suggested, accept, onDone }: {
  jobId: string;
  suggested: number;
  onDone: () => void;
  accept: ReturnType<typeof useServerFn<typeof acceptJob>>;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [price, setPrice] = useState(((suggested || 15000) / 100).toFixed(2));
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await accept({ data: { jobId, scheduledAt: new Date(date).toISOString(), priceCents: Math.round(parseFloat(price) * 100) } });
      toast.success("Job scheduled");
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-2xl bg-primary px-6 text-primary-foreground shadow-brand">Accept Job</Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">Schedule this job</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date & time</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Price (USD)</Label>
            <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} className="rounded-2xl">Cancel</Button>
          <Button onClick={submit} disabled={busy} className="rounded-2xl bg-primary text-primary-foreground">
            {busy ? "Scheduling…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

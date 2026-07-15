import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { markDone, markPaid } from "@/lib/jobs.functions";
import { currency } from "@/lib/flowline";
import { CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/schedule")({
  component: Schedule,
});

function Schedule() {
  const qc = useQueryClient();
  const done = useServerFn(markDone);
  const pay = useServerFn(markPaid);

  const { data: jobs } = useQuery({
    queryKey: ["jobs", "schedule"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs")
        .select("id, description, scheduled_at, status, final_price_cents, suggested_price_cents, customer:customers(name, phone, address)")
        .in("status", ["scheduled", "in_progress", "completed", "paid"])
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  const groups = groupByDay(jobs ?? []);

  const doneM = useMutation({
    mutationFn: (jobId: string) => done({ data: { jobId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Marked done"); },
    onError: (e) => toast.error(e.message),
  });
  const payM = useMutation({
    mutationFn: (jobId: string) => pay({ data: { jobId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); qc.invalidateQueries({ queryKey: ["earnings", "summary"] }); toast.success("Payment recorded"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">Schedule</h1>
        <p className="mt-1 text-muted-foreground">Everything you've accepted, day by day.</p>
      </header>

      {groups.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-border bg-surface p-12 text-center text-muted-foreground">
          Nothing scheduled yet. Accept a request to get started.
        </div>
      )}

      <div className="space-y-8">
        {groups.map(([day, list]) => (
          <section key={day}>
            <div className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{day}</div>
            <div className="space-y-3">
              {list.map((j) => {
                const c = j.customer as { name: string; phone: string; address: string | null } | null;
                const time = j.scheduled_at ? new Date(j.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
                const price = j.final_price_cents ?? j.suggested_price_cents ?? 0;
                return (
                  <div key={j.id} className="flex flex-col gap-4 rounded-3xl border-2 border-border bg-surface p-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4 sm:w-40 sm:border-r sm:border-border sm:pr-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Time</div>
                        <div className="font-mono text-lg font-bold">{time}</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{j.description}</h3>
                      <p className="text-xs text-muted-foreground">{c?.name}{c?.address ? ` · ${c.address}` : ""} · <StatusPill status={j.status} /></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{currency(price)}</span>
                      {j.status === "scheduled" || j.status === "in_progress" ? (
                        <Button size="sm" variant="secondary" onClick={() => doneM.mutate(j.id)} className="rounded-xl">
                          <CheckCircle2 className="mr-1 size-4" /> Done
                        </Button>
                      ) : null}
                      {j.status === "completed" ? (
                        <Button size="sm" onClick={() => payM.mutate(j.id)} className="rounded-xl bg-primary text-primary-foreground">
                          <DollarSign className="mr-1 size-4" /> Mark paid
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "text-primary",
    in_progress: "text-accent-foreground",
    completed: "text-warning-foreground",
    paid: "text-success",
  };
  return <span className={`font-bold uppercase ${map[status] ?? ""}`}>{status.replace("_", " ")}</span>;
}

function groupByDay(jobs: Array<{ scheduled_at: string | null } & Record<string, unknown>>) {
  const by = new Map<string, typeof jobs>();
  for (const j of jobs) {
    const key = j.scheduled_at ? new Date(j.scheduled_at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) : "Unscheduled";
    if (!by.has(key)) by.set(key, []);
    by.get(key)!.push(j);
  }
  return Array.from(by.entries());
}

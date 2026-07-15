import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currency, loyaltyTier, initials, urgencyLabel } from "@/lib/flowline";
import { ArrowLeft, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, address, lifetime_spend_cents, visit_count, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["customer-jobs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, description, status, urgency, scheduled_at, final_price_cents, suggested_price_cents, created_at, paid_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["customer-payments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount_cents, kind, status, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["customer-messages", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, body, direction, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-5xl p-8 text-muted-foreground">Loading…</div>;
  }
  if (!customer) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <Link to="/customers" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="size-4" /> Back to customers
        </Link>
        <p className="mt-6 text-muted-foreground">Customer not found.</p>
      </div>
    );
  }

  const tier = loyaltyTier(customer.lifetime_spend_cents, customer.visit_count);

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <Link to="/customers" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="size-4" /> All customers
      </Link>

      <header className="mb-8 flex items-start gap-5">
        <div className="grid size-16 place-items-center rounded-full bg-accent/20 font-display text-2xl font-bold text-accent-foreground">
          {initials(customer.name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl font-bold tracking-tight">{customer.name}</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs">
              <span className={`size-2 rounded-full ${tier.dot}`} />
              <span className="font-bold text-muted-foreground">{tier.label}</span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 font-mono hover:text-foreground">
              <Phone className="size-3.5" /> {customer.phone}
            </a>
            {customer.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {customer.address}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Lifetime spend" value={currency(customer.lifetime_spend_cents)} />
        <Stat label="Visits" value={String(customer.visit_count)} />
        <Stat label="Customer since" value={new Date(customer.created_at).toLocaleDateString()} />
      </div>

      <Section title="Jobs">
        {(!jobs || jobs.length === 0) && <Empty text="No jobs yet." />}
        <div className="space-y-3">
          {jobs?.map((j) => {
            const urg = urgencyLabel(j.urgency);
            const amt = j.final_price_cents ?? j.suggested_price_cents ?? 0;
            return (
              <div key={j.id} className="rounded-2xl border-2 border-border bg-surface p-4">
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge status={j.status} />
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${urg.cls}`}>{urg.label}</span>
                  <span className="ml-auto font-mono text-sm font-bold">{currency(amt)}</span>
                </div>
                <p className="text-sm">{j.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {j.scheduled_at ? `Scheduled ${new Date(j.scheduled_at).toLocaleString()}` : `Received ${new Date(j.created_at).toLocaleDateString()}`}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Payments">
        {(!payments || payments.length === 0) && <Empty text="No payments yet." />}
        <div className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
          {payments?.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
              <div>
                <div className="text-sm font-bold capitalize">{p.kind}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className={`font-mono font-bold ${p.amount_cents < 0 ? "text-muted-foreground" : "text-foreground"}`}>
                {currency(p.amount_cents)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Recent messages">
        {(!messages || messages.length === 0) && <Empty text="No messages yet." />}
        <div className="space-y-2">
          {messages?.map((m) => (
            <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${
              m.direction === "outbound" ? "bg-primary/10" :
              m.direction === "system"   ? "bg-surface-muted italic text-muted-foreground" :
                                           "bg-surface border border-border"
            }`}>
              {m.body}
              <div className="mt-0.5 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-surface p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-accent/20 text-accent-foreground",
    scheduled: "bg-primary/10 text-primary",
    in_progress: "bg-primary/10 text-primary",
    completed: "bg-muted text-muted-foreground",
    paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    declined: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${map[status] ?? "bg-muted"}`}>{status.replace("_", " ")}</span>;
}

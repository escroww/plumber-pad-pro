import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currency, loyaltyTier, urgencyLabel, initials } from "@/lib/flowline";
import { ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("business_name, slug").maybeSingle()).data,
  });

  const { data: pending } = useQuery({
    queryKey: ["jobs", "pending"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs")
        .select("id, description, ai_summary, urgency, suggested_price_cents, created_at, customer:customers(id,name,lifetime_spend_cents,visit_count)")
        .eq("status", "pending").order("created_at", { ascending: false }).limit(4);
      return data ?? [];
    },
  });

  const { data: todays } = useQuery({
    queryKey: ["jobs", "today"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const { data } = await supabase.from("jobs")
        .select("id, description, scheduled_at, status, customer:customers(name, address)")
        .in("status", ["scheduled", "in_progress", "completed"])
        .gte("scheduled_at", start.toISOString()).lt("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ["earnings", "summary"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("amount_cents, kind, created_at");
      const list = data ?? [];
      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
      const balance = list.reduce((s, p) => s + p.amount_cents, 0);
      const weekEarnings = list.filter(p => p.kind === "payment" && new Date(p.created_at) >= weekStart).reduce((s, p) => s + p.amount_cents, 0);
      return { balance, weekEarnings };
    },
  });

  const [copied, setCopied] = useState(false);
  const bookingUrl = profile?.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${profile.slug}` : "";

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true); toast.success("Booking link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-8">
      <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="animate-in-up">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Good {greeting()}, {(profile?.business_name ?? "there").split(" ")[0]}.
          </h1>
          <p className="mt-1.5 font-medium text-muted-foreground">
            {pending?.length ? <>You have <span className="text-primary">{pending.length} new request{pending.length === 1 ? "" : "s"}</span> waiting for review.</> : "You're all caught up on requests."}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="min-w-[160px] rounded-3xl border-2 border-border bg-surface p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Week earnings</div>
            <div className="mt-1 font-display text-2xl font-bold">{currency(earnings?.weekEarnings ?? 0)}</div>
          </div>
          <div className="min-w-[160px] rounded-3xl bg-primary p-4 text-primary-foreground shadow-brand">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Balance</div>
            <div className="mt-1 font-display text-2xl font-bold">{currency(earnings?.balance ?? 0)}</div>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Pending Requests</h2>
            <Link to="/requests" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>

          {pending && pending.length > 0 ? pending.map((job, i) => {
            const cust = job.customer as { id: string; name: string; lifetime_spend_cents: number; visit_count: number } | null;
            const tier = cust ? loyaltyTier(cust.lifetime_spend_cents ?? 0, cust.visit_count ?? 0) : loyaltyTier(0, 0);
            const urg = urgencyLabel(job.urgency);
            return (
              <Link to="/requests" key={job.id} className="block animate-in-up rounded-3xl border-2 border-border bg-surface p-6 transition-colors hover:border-primary" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full border-2 border-accent bg-accent/20 font-bold text-accent-foreground">
                      {initials(cust?.name ?? "?")}
                    </div>
                    <div>
                      <h3 className="font-bold">{cust?.name ?? "Unknown"}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${tier.dot}`} />
                        <span className="text-xs font-bold text-muted-foreground">{tier.label}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase ${urg.cls}`}>{urg.label}</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  <span className="font-bold text-foreground">Request:</span> {job.ai_summary ?? job.description}
                </p>
                <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  {job.suggested_price_cents ? <>Suggested price <span className="font-mono font-semibold text-foreground">{currency(job.suggested_price_cents)}</span></> : "No price suggestion yet"}
                </div>
              </Link>
            );
          }) : (
            <EmptyRequests bookingUrl={bookingUrl} copyLink={copyLink} copied={copied} />
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border-2 border-border bg-surface p-6">
            <h2 className="font-display text-xl font-bold">Today's Schedule</h2>
            <div className="mt-6 space-y-5">
              {todays && todays.length > 0 ? todays.map((j) => {
                const c = j.customer as { name: string; address: string | null } | null;
                const time = j.scheduled_at ? new Date(j.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={j.id} className="relative border-l-4 border-primary/20 pl-5">
                    <div className="absolute -left-[6px] top-1 size-3 rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase text-primary">{time}</span>
                    <p className="font-bold text-sm">{j.description.slice(0, 40)}</p>
                    <p className="text-xs text-muted-foreground">{c?.name}{c?.address ? ` · ${c.address}` : ""}</p>
                  </div>
                );
              }) : <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>}
            </div>
            <Link to="/schedule" className="mt-6 flex w-full items-center justify-center rounded-2xl border-2 border-border py-3 text-xs font-bold uppercase tracking-widest hover:bg-surface-muted">
              Full schedule
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-foreground p-6 text-background">
            <div className="relative z-10">
              <h3 className="font-display text-lg font-bold">Your booking link</h3>
              <p className="mt-2 text-xs opacity-70">Share this with customers. They tap it, submit a request, land here.</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 p-3">
                <span className="flex-1 truncate font-mono text-xs">{bookingUrl || "…"}</span>
                <button onClick={copyLink} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-primary/40 blur-3xl" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function EmptyRequests({ bookingUrl, copyLink, copied }: { bookingUrl: string; copyLink: () => void; copied: boolean }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-surface p-8 text-center">
      <h3 className="font-display text-lg font-bold">No pending requests yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">Share your booking link to start getting jobs.</p>
      <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-xl border border-border bg-surface-muted p-3">
        <span className="flex-1 truncate text-left font-mono text-xs">{bookingUrl || "…"}</span>
        <button onClick={copyLink} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

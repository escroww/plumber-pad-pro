import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currency, loyaltyTier, initials } from "@/lib/flowline";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers")({
  component: Customers,
});

function Customers() {
  const { data } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone, address, lifetime_spend_cents, visit_count").order("lifetime_spend_cents", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-muted-foreground">Sorted by lifetime spend. Loyalty tiers update automatically.</p>
      </header>

      {(!data || data.length === 0) && (
        <div className="rounded-3xl border-2 border-dashed border-border bg-surface p-12 text-center text-muted-foreground">
          No customers yet. They'll appear here after their first request.
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border-2 border-border bg-surface">
        {data?.map((c, i) => {
          const t = loyaltyTier(c.lifetime_spend_cents, c.visit_count);
          return (
            <Link key={c.id} to="/customers/$id" params={{ id: c.id }} className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-muted ${i > 0 ? "border-t border-border" : ""}`}>
              <div className="grid size-11 place-items-center rounded-full bg-accent/20 font-bold text-accent-foreground">{initials(c.name)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{c.name}</span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className={`size-2 rounded-full ${t.dot}`} />
                    <span className="font-bold text-muted-foreground">{t.label}</span>
                  </span>
                </div>
                <div className="font-mono text-xs text-muted-foreground">{c.phone}{c.address ? ` · ${c.address}` : ""}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold">{currency(c.lifetime_spend_cents)}</div>
                <div className="text-xs text-muted-foreground">{c.visit_count} visit{c.visit_count === 1 ? "" : "s"}</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

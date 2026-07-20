import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plan")({
  component: PlanPage,
});

const FREE = [
  "Public booking link (/r/your-slug)",
  "Unlimited customer requests",
  "In-app messaging & schedule",
  "AI job summaries & price suggestions",
  "Up to 25 completed jobs / month",
];

const PRO = [
  "Everything in Free",
  "Unlimited jobs & customers",
  "Real Stripe Connect payouts",
  "Twilio SMS delivery (inbound + outbound)",
  "Smart reminders & no-show follow-ups",
  "Priority AI (faster, richer summaries)",
  "Custom booking domain",
];

function PlanPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("id, tier").maybeSingle()).data,
  });

  const setTier = useMutation({
    mutationFn: async (tier: "free" | "pro") => {
      const { error } = await supabase.from("profiles").update({ tier }).eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: (_v, tier) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(tier === "pro" ? "Welcome to Pro" : "Switched to Free");
    },
    onError: (e) => toast.error(e.message),
  });

  const tier = profile?.tier ?? "free";

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">Choose your plan</h1>
        <p className="mt-1 text-muted-foreground">Start free. Upgrade when you're ready to bill and text at scale.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          sub="Forever, for solo plumbers getting started"
          items={FREE}
          current={tier === "free"}
          onPick={() => setTier.mutate("free")}
          busy={setTier.isPending}
          variant="light"
        />
        <PlanCard
          name="Pro"
          price="$29"
          sub="Per month — cancel anytime"
          items={PRO}
          current={tier === "pro"}
          onPick={() => setTier.mutate("pro")}
          busy={setTier.isPending}
          variant="dark"
          highlight
        />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Stripe Connect and Twilio hook-ups activate automatically after upgrading. No credit card required to try Pro this week.
      </p>
    </div>
  );
}

function PlanCard({
  name, price, sub, items, current, onPick, busy, variant, highlight,
}: {
  name: string; price: string; sub: string; items: string[];
  current: boolean; onPick: () => void; busy: boolean;
  variant: "light" | "dark"; highlight?: boolean;
}) {
  const dark = variant === "dark";
  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 p-8 ${dark ? "border-foreground bg-foreground text-background" : "border-border bg-surface"}`}>
      {highlight && (
        <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase text-accent-foreground">
          <Sparkles className="size-3" /> Recommended
        </span>
      )}
      <div className="flex items-center gap-2">
        {dark && <Zap className="size-5 text-accent" strokeWidth={2.5} />}
        <h2 className="font-display text-2xl font-bold">{name}</h2>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-5xl font-bold tracking-tight">{price}</span>
        {name === "Pro" && <span className={`text-sm ${dark ? "opacity-70" : "text-muted-foreground"}`}>/mo</span>}
      </div>
      <p className={`mt-1 text-sm ${dark ? "opacity-70" : "text-muted-foreground"}`}>{sub}</p>

      <ul className="mt-6 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-sm">
            <Check className={`mt-0.5 size-4 shrink-0 ${dark ? "text-accent" : "text-primary"}`} strokeWidth={2.5} />
            <span>{it}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onPick}
        disabled={busy || current}
        className={`mt-8 w-full rounded-2xl py-6 text-sm font-bold ${
          current
            ? "bg-muted text-muted-foreground"
            : dark
              ? "bg-accent text-accent-foreground hover:bg-accent/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {current ? "Current plan" : name === "Pro" ? "Upgrade to Pro" : "Use Free"}
      </Button>
    </div>
  );
}

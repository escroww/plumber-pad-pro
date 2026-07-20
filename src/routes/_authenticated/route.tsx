import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Inbox, CalendarDays, MessageSquare, Users, CircleDollarSign, Settings, LogOut, Droplet, Sparkles, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/payments", label: "Payments", icon: CircleDollarSign },
  { to: "/plan", label: "Plan", icon: Sparkles },
  { to: "/whats-new", label: "What's new", icon: Rocket },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthedLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("business_name, slug").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-count"],
    queryFn: async () => {
      const { count } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count ?? 0;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2.5 px-2 py-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand">
            <Droplet className="size-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Flowline</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}>
                <n.icon className="size-4" strokeWidth={2.5} />
                <span>{n.label}</span>
                {n.to === "/requests" && pendingCount ? (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{pendingCount}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-border bg-surface-muted p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signed in as</div>
          <div className="mt-1 truncate font-display text-sm font-bold">{profile?.business_name ?? "…"}</div>
          {profile?.slug && (
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">/r/{profile.slug}</div>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} className="mt-3 w-full justify-start rounded-xl px-2 text-muted-foreground hover:text-foreground">
            <LogOut className="mr-2 size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("business_name, slug, phone").maybeSingle()).data,
  });
  const [biz, setBiz] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (profile) { setBiz(profile.business_name); setPhone(profile.phone ?? ""); } }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ business_name: biz, phone }).eq("id", (await supabase.auth.getUser()).data.user!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Saved"); },
    onError: (e) => toast.error(e.message),
  });

  const bookingUrl = profile?.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${profile.slug}` : "";

  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted-foreground">Your business profile and booking link.</p>

      <div className="mt-8 rounded-3xl border-2 border-border bg-surface p-6">
        <h2 className="font-display text-lg font-bold">Business</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label>Business name</Label>
            <Input value={biz} onChange={(e) => setBiz(e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-2xl bg-primary text-primary-foreground">Save</Button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border-2 border-border bg-surface p-6">
        <h2 className="font-display text-lg font-bold">Public booking link</h2>
        <p className="mt-1 text-sm text-muted-foreground">Share this so customers can send new job requests.</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-3">
          <span className="flex-1 truncate font-mono text-sm">{bookingUrl}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(bookingUrl); setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 1200); }}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border-2 border-dashed border-border bg-surface p-6">
        <h2 className="font-display text-lg font-bold">Payouts (Stripe Connect)</h2>
        <p className="mt-1 text-sm text-muted-foreground">Coming next: connect a bank account or debit card via Stripe Connect to receive real payouts. Until then, Payments works with an in-app ledger.</p>
      </div>
    </div>
  );
}

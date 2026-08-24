import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPublicPlumber, submitJobRequest } from "@/lib/public.functions";
import { useState } from "react";
import { z } from "zod";
import { Droplet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/r/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Request a plumber — ${params.slug}` },
      { name: "description", content: "Send a job request and get a call back." },
    ],
  }),
  component: PublicRequest,
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(5).max(1000),
  urgency: z.enum(["today", "week", "whenever"]),
});

function PublicRequest() {
  const { slug } = useParams({ from: "/r/$slug" });
  const { data: plumber, isLoading } = useQuery({
    queryKey: ["plumber", slug],
    queryFn: async () => (await supabase.from("profiles").select("business_name, slug").eq("slug", slug).maybeSingle()).data,
  });

  const [form, setForm] = useState<{ name: string; phone: string; address: string; description: string; urgency: "today" | "week" | "whenever" }>({ name: "", phone: "", address: "", description: "", urgency: "week" });
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const { error } = await supabase.rpc("submit_request", {
        p_slug: slug,
        p_name: parsed.name,
        p_phone: parsed.phone,
        p_address: parsed.address || "",
        p_description: parsed.description,
        p_urgency: parsed.urgency,
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!plumber) return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">Not found</h1>
        <p className="text-muted-foreground">That booking link doesn't exist.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand">
            <Droplet className="size-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-tight">{plumber.business_name}</div>
            <div className="text-xs text-muted-foreground">via Flowline</div>
          </div>
        </div>

        {submitted ? (
          <div className="animate-in-up rounded-3xl border-2 border-border bg-surface p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" strokeWidth={2} />
            <h2 className="mt-4 font-display text-2xl font-bold">Request sent</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plumber.business_name} will text you shortly to confirm.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
            className="animate-in-up space-y-5 rounded-3xl border-2 border-border bg-surface p-6"
          >
            <div>
              <h1 className="font-display text-2xl font-bold">Request a plumber</h1>
              <p className="mt-1 text-sm text-muted-foreground">Tell us what's going on. No account, no download.</p>
            </div>
            <div>
              <Label>Your name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>What's the issue?</Label>
              <textarea required rows={4} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Leaking sink under the kitchen, water is pooling…" />
            </div>
            <div>
              <Label>How urgent?</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["today", "week", "whenever"] as const).map(u => (
                  <button type="button" key={u} onClick={() => setForm({ ...form, urgency: u })} className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wide ${form.urgency === u ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    {u === "today" ? "Today" : u === "week" ? "This week" : "Whenever"}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={submit.isPending} className="w-full rounded-2xl bg-primary text-primary-foreground shadow-brand">
              {submit.isPending ? "Sending…" : "Send request"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

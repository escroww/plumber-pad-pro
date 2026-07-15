import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendMessage } from "@/lib/jobs.functions";
import { initials } from "@/lib/flowline";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages")({
  component: Messages,
});

function Messages() {
  const qc = useQueryClient();
  const send = useServerFn(sendMessage);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => { if (!activeId && threads?.[0]) setActiveId(threads[0].id); }, [threads, activeId]);

  const { data: msgs } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("id, body, direction, created_at").eq("customer_id", activeId!).order("created_at");
      return data ?? [];
    },
  });

  const active = threads?.find(t => t.id === activeId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [msgs?.length]);

  const sendM = useMutation({
    mutationFn: async (body: string) => send({ data: { customerId: activeId!, body } }),
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey: ["messages", activeId] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex h-screen">
      <aside className="w-80 shrink-0 border-r border-border bg-surface">
        <div className="border-b border-border p-6">
          <h1 className="font-display text-2xl font-bold">Messages</h1>
          <p className="text-xs text-muted-foreground">One thread per customer.</p>
        </div>
        <div className="overflow-auto">
          {threads?.length === 0 && <p className="p-6 text-sm text-muted-foreground">No customers yet.</p>}
          {threads?.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)} className={`flex w-full items-center gap-3 border-b border-border px-6 py-4 text-left transition-colors ${activeId === t.id ? "bg-primary/5" : "hover:bg-surface-muted"}`}>
              <div className="grid size-10 place-items-center rounded-full bg-accent/20 font-bold text-accent-foreground">{initials(t.name)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{t.name}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{t.phone}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col bg-background">
        {active ? (
          <>
            <div className="border-b border-border bg-surface px-6 py-4">
              <h2 className="font-bold">{active.name}</h2>
              <p className="font-mono text-xs text-muted-foreground">{active.phone}</p>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto p-6">
              {msgs?.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm ${
                    m.direction === "outbound" ? "bg-primary text-primary-foreground" :
                    m.direction === "system"   ? "bg-surface-muted text-muted-foreground italic" :
                                                 "bg-surface border border-border"
                  }`}>
                    {m.body}
                    <div className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {msgs?.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet. Say hi.</p>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) sendM.mutate(draft.trim()); }} className="flex items-center gap-2 border-t border-border bg-surface p-4">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" className="flex-1 rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
              <Button type="submit" disabled={sendM.isPending || !draft.trim()} className="rounded-2xl bg-primary text-primary-foreground">
                <Send className="size-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-muted-foreground">Select a conversation</div>
        )}
      </div>
    </div>
  );
}

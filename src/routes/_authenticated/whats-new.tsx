import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, Rocket, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/whats-new")({
  component: WhatsNew,
});

const UPDATES = [
  {
    date: "This week",
    title: "Payment links & escrow",
    body: "Share a /pay/… link with any customer. Their payment sits in escrow until you mark the job done — then it drops into your balance automatically.",
  },
  {
    date: "This week",
    title: "Plan tiers (Free / Pro)",
    body: "Pick the tier that matches how much you're billing. Upgrade or downgrade any time from the Plan tab.",
  },
  {
    date: "This week",
    title: "Payments organized in tabs",
    body: "Held, Earnings and Withdrawals are now separate views so it's obvious what money is yours and what's still in escrow.",
  },
  {
    date: "Last week",
    title: "AI request analysis",
    body: "New pending requests get a one-sentence summary and a fair price suggestion the moment they land.",
  },
  {
    date: "Last week",
    title: "Customer detail pages",
    body: "Tap any customer to see lifetime spend, visit count, full job history, payments and messages in one place.",
  },
];

const ROADMAP = [
  {
    tag: "Next up",
    title: "Real Stripe Connect payouts",
    body: "Connect a bank / debit card and get real card capture on the pay link, with same-day payouts.",
  },
  {
    tag: "Next up",
    title: "Twilio SMS delivery",
    body: "Every message and system update sent as a real SMS. Inbound texts appear as new requests with AI job detection.",
  },
  {
    tag: "Soon",
    title: "Smart reminders",
    body: "Automatic day-before and 1-hour-before texts. No-show follow-ups. Review requests after payment.",
  },
  {
    tag: "Soon",
    title: "Custom booking domain",
    body: "Point book.yourcompany.com at your Flowline intake page.",
  },
  {
    tag: "Later",
    title: "Route optimization",
    body: "Group same-day jobs by neighborhood so you burn less time driving.",
  },
];

function WhatsNew() {
  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">What's new</h1>
        <p className="mt-1 text-muted-foreground">Recent updates and what's coming next.</p>
      </header>

      <Tabs defaultValue="updates">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="updates" className="rounded-xl gap-1.5"><Sparkles className="size-3.5" /> Updates</TabsTrigger>
          <TabsTrigger value="roadmap" className="rounded-xl gap-1.5"><Rocket className="size-3.5" /> Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="mt-6 space-y-4">
          {UPDATES.map((u) => (
            <article key={u.title} className="rounded-3xl border-2 border-border bg-surface p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{u.date}</span>
              </div>
              <h3 className="mt-2 font-display text-lg font-bold">{u.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{u.body}</p>
            </article>
          ))}
        </TabsContent>

        <TabsContent value="roadmap" className="mt-6 space-y-4">
          {ROADMAP.map((r) => (
            <article key={r.title} className="rounded-3xl border-2 border-dashed border-border bg-surface p-6">
              <span className="inline-flex rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-accent-foreground">
                {r.tag}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplet, Wrench, MessageSquare, CircleDollarSign, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand">
            <Droplet className="size-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Flowline</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-90">
            Start free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="animate-in-up py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> Built for solo plumbers
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Your business,<br />
            <span className="text-primary">not your notebook.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Flowline replaces the mess of text threads, sticky notes, and forgotten invoices with one clean tool. Requests come in, jobs get scheduled, customers get billed — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-90">
              Get your booking link <ArrowRight className="size-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center rounded-2xl border-2 border-border bg-surface px-6 py-3.5 text-sm font-semibold hover:border-primary">
              I already have an account
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free to start. No card required. Your customers never download an app.</p>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wrench, title: "Job requests", copy: "Customers submit through your booking link. Land in one queue with AI-cleaned summaries." },
            { icon: Droplet, title: "One tap schedule", copy: "Accept a request, pick a time, done. Customer gets an automatic confirmation text." },
            { icon: MessageSquare, title: "Unified chat", copy: "Every text with every customer, in one thread — out of your personal phone." },
            { icon: CircleDollarSign, title: "Get paid faster", copy: "Send a payment link when you're ready to bill. Money lands in your balance." },
          ].map((f, i) => (
            <div key={i} className="rounded-3xl border-2 border-border bg-surface p-6 transition-colors hover:border-primary">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" strokeWidth={2.5} />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.copy}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Flowline. One trade at a time.</span>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

export function loyaltyTier(spendCents: number, visits: number): { tier: "top" | "regular" | "new"; dot: string; label: string } {
  if (spendCents >= 100_000 || visits >= 5) return { tier: "top", dot: "bg-destructive", label: "Top client" };
  if (visits >= 2) return { tier: "regular", dot: "bg-accent", label: "Regular" };
  return { tier: "new", dot: "bg-muted-foreground/40", label: "New" };
}

export function currency(cents: number | null | undefined) {
  const n = (cents ?? 0) / 100;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

export function urgencyLabel(u: string) {
  return u === "today" ? { label: "ASAP", cls: "bg-destructive/10 text-destructive" }
    : u === "week"    ? { label: "This week", cls: "bg-accent/20 text-accent-foreground" }
    :                   { label: "Whenever", cls: "bg-muted text-muted-foreground" };
}

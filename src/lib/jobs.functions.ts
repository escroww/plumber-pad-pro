import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AcceptInput = z.object({
  jobId: z.string().uuid(),
  scheduledAt: z.string(),
  priceCents: z.number().int().nonnegative(),
});

export const acceptJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AcceptInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job, error } = await supabase
      .from("jobs")
      .update({
        status: "scheduled",
        scheduled_at: data.scheduledAt,
        final_price_cents: data.priceCents,
      })
      .eq("id", data.jobId)
      .eq("plumber_id", userId)
      .select("customer_id, description")
      .single();
    if (error) throw error;
    await supabase.from("messages").insert({
      plumber_id: userId,
      customer_id: job.customer_id,
      job_id: data.jobId,
      direction: "system",
      body: `Job accepted — scheduled for ${new Date(data.scheduledAt).toLocaleString()}. Price: $${(data.priceCents / 100).toFixed(2)}.`,
    });
    return { ok: true };
  });

const DeclineInput = z.object({ jobId: z.string().uuid() });
export const declineJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeclineInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("jobs").update({ status: "declined" })
      .eq("id", data.jobId).eq("plumber_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const markDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeclineInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Look up the job first so we can decide whether to release a held payment
    const { data: job, error: jerr } = await supabase.from("jobs")
      .select("id, customer_id, final_price_cents, suggested_price_cents")
      .eq("id", data.jobId).eq("plumber_id", userId).single();
    if (jerr) throw jerr;

    // Is there a held (escrow) payment for this job?
    const { data: held } = await supabase.from("payments")
      .select("id, amount_cents")
      .eq("job_id", job.id).eq("kind", "payment").eq("status", "held")
      .maybeSingle();

    if (held) {
      // Release the escrow: mark payment succeeded, job paid, bump customer stats
      const now = new Date().toISOString();
      await supabase.from("payments")
        .update({ status: "succeeded", released_at: now })
        .eq("id", held.id);
      await supabase.from("jobs")
        .update({ status: "paid", completed_at: now, paid_at: now })
        .eq("id", job.id);
      const { data: cust } = await supabase.from("customers")
        .select("lifetime_spend_cents, visit_count").eq("id", job.customer_id).single();
      if (cust) {
        await supabase.from("customers").update({
          lifetime_spend_cents: (cust.lifetime_spend_cents ?? 0) + held.amount_cents,
          visit_count: (cust.visit_count ?? 0) + 1,
        }).eq("id", job.customer_id);
      }
      await supabase.from("messages").insert({
        plumber_id: userId, customer_id: job.customer_id, job_id: job.id,
        direction: "system", body: `Job completed — $${(held.amount_cents / 100).toFixed(2)} released to your balance.`,
      });
      return { ok: true, released: held.amount_cents };
    }

    // No escrow — just mark completed and wait for markPaid
    const { error } = await supabase.from("jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    if (error) throw error;
    return { ok: true, released: 0 };
  });


const PayInput = z.object({ jobId: z.string().uuid() });
export const markPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PayInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job, error } = await supabase.from("jobs")
      .select("id, customer_id, final_price_cents, suggested_price_cents, status")
      .eq("id", data.jobId).eq("plumber_id", userId).single();
    if (error) throw error;
    const amount = job.final_price_cents ?? job.suggested_price_cents ?? 0;
    if (amount <= 0) throw new Error("No price set on this job");
    await supabase.from("jobs").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", job.id);
    await supabase.from("payments").insert({
      plumber_id: userId, job_id: job.id, customer_id: job.customer_id,
      amount_cents: amount, kind: "payment", status: "succeeded",
    });
    // update customer lifetime spend + visit count
    const { data: cust } = await supabase.from("customers").select("lifetime_spend_cents, visit_count").eq("id", job.customer_id).single();
    if (cust) {
      await supabase.from("customers").update({
        lifetime_spend_cents: (cust.lifetime_spend_cents ?? 0) + amount,
        visit_count: (cust.visit_count ?? 0) + 1,
      }).eq("id", job.customer_id);
    }
    return { ok: true, amount };
  });

const WithdrawInput = z.object({ amountCents: z.number().int().positive() });
export const withdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => WithdrawInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("payments").insert({
      plumber_id: context.userId,
      amount_cents: -Math.abs(data.amountCents),
      kind: "withdrawal", status: "succeeded",
    });
    if (error) throw error;
    return { ok: true };
  });

const SendMessageInput = z.object({
  customerId: z.string().uuid(),
  body: z.string().min(1).max(1000),
});
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendMessageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("messages").insert({
      plumber_id: context.userId,
      customer_id: data.customerId,
      direction: "outbound",
      body: data.body,
    });
    if (error) throw error;
    return { ok: true };
  });

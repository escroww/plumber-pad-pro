import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugSchema = z.object({ slug: z.string().trim().min(1).max(120) });
const jobSchema = z.object({ jobId: z.string().uuid() });

const requestSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  address: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().min(5).max(1000),
  urgency: z.enum(["today", "week", "whenever"]),
});

/** Public booking page: only non-sensitive profile fields are ever returned. */
export const getPublicPlumber = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("business_name, slug")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) {
      console.error("[getPublicPlumber]", error);
      throw new Error("Unable to load booking page");
    }
    return row ? { business_name: row.business_name, slug: row.slug } : null;
  });

export const submitJobRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("submit_request", {
      p_slug: data.slug,
      p_name: data.name,
      p_phone: data.phone,
      p_address: data.address ?? "",
      p_description: data.description,
      p_urgency: data.urgency,
    });
    if (error) {
      console.error("[submitJobRequest]", error);
      throw new Error("Could not send your request. Please try again.");
    }
    return { ok: true };
  });

export const getPayInfo = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => jobSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_pay_info", { p_job_id: data.jobId });
    if (error) {
      console.error("[getPayInfo]", error);
      throw new Error("Unable to load this invoice");
    }
    return rows?.[0] ?? null;
  });

/** Amount is always resolved server-side from the job, never trusted from the client. */
export const submitJobPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => jobSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error: infoError } = await supabaseAdmin.rpc("get_pay_info", { p_job_id: data.jobId });
    if (infoError) {
      console.error("[submitJobPayment:info]", infoError);
      throw new Error("Unable to load this invoice");
    }
    const info = rows?.[0];
    if (!info) throw new Error("Invoice not found");
    if (info.already_paid) throw new Error("This job is already paid");
    if (!info.amount_cents || info.amount_cents <= 0) throw new Error("This invoice has no amount due");

    const { error } = await supabaseAdmin.rpc("submit_payment", {
      p_job_id: data.jobId,
      p_amount_cents: info.amount_cents,
    });
    if (error) {
      console.error("[submitJobPayment]", error);
      throw new Error("Payment could not be processed");
    }
    return { ok: true };
  });

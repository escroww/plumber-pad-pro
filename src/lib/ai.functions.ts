import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ jobId: z.string().uuid() });

export const analyzeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job, error } = await supabase
      .from("jobs")
      .select("id, description, urgency, ai_summary, suggested_price_cents")
      .eq("id", data.jobId)
      .eq("plumber_id", userId)
      .single();
    if (error) throw error;
    if (job.ai_summary && job.suggested_price_cents) {
      return { summary: job.ai_summary, suggested_price_cents: job.suggested_price_cents, cached: true };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert plumbing dispatcher. Given a customer's request, respond with a JSON object: {\"summary\": one crisp sentence naming the likely issue and required work, \"suggested_price_cents\": integer USD cents for a fair fixed-price quote for a solo plumber (typical range 12000-80000)}. No prose, JSON only.",
          },
          {
            role: "user",
            content: `Urgency: ${job.urgency}\nRequest: ${job.description}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI rate limit — try again shortly");
      if (res.status === 402) throw new Error("AI credits exhausted — add credits in workspace billing");
      throw new Error(`AI error [${res.status}]: ${body}`);
    }

    const json = await res.json() as { choices: { message: { content: string } }[] };
    let parsed: { summary?: string; suggested_price_cents?: number } = {};
    try {
      parsed = JSON.parse(json.choices[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const summary = (parsed.summary ?? "").toString().slice(0, 300) || null;
    const priceRaw = Number(parsed.suggested_price_cents);
    const price = Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(Math.min(priceRaw, 500_000)) : null;

    await supabase
      .from("jobs")
      .update({ ai_summary: summary, suggested_price_cents: price })
      .eq("id", job.id)
      .eq("plumber_id", userId);

    return { summary, suggested_price_cents: price, cached: false };
  });

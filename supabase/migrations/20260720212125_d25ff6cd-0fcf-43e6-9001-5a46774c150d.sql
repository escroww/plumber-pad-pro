
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- Public RPC: customer submits payment via pay link. Creates a held payment.
CREATE OR REPLACE FUNCTION public.submit_payment(p_job_id uuid, p_amount_cents integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_pay uuid;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  SELECT id, plumber_id, customer_id, status INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE job_id = p_job_id AND kind = 'payment' AND status IN ('held','succeeded')) THEN
    RAISE EXCEPTION 'This job is already paid';
  END IF;
  INSERT INTO public.payments (plumber_id, customer_id, job_id, amount_cents, kind, status)
  VALUES (v_job.plumber_id, v_job.customer_id, v_job.id, p_amount_cents, 'payment', 'held')
  RETURNING id INTO v_pay;

  INSERT INTO public.messages (plumber_id, customer_id, job_id, direction, body)
  VALUES (v_job.plumber_id, v_job.customer_id, v_job.id, 'system',
          'Customer paid $' || (p_amount_cents::numeric / 100)::text || ' — held in escrow until the job is marked done.');
  RETURN v_pay;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment(uuid, integer) TO anon, authenticated;

-- Public RPC: fetch minimal job info for the pay page.
CREATE OR REPLACE FUNCTION public.get_pay_info(p_job_id uuid)
RETURNS TABLE(job_id uuid, description text, business_name text, amount_cents integer, already_paid boolean, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT j.id,
         j.description,
         p.business_name,
         COALESCE(j.final_price_cents, j.suggested_price_cents, 0),
         EXISTS(SELECT 1 FROM public.payments pay WHERE pay.job_id = j.id AND pay.kind = 'payment' AND pay.status IN ('held','succeeded')),
         j.status::text
  FROM public.jobs j
  JOIN public.profiles p ON p.id = j.plumber_id
  WHERE j.id = p_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pay_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pay_info(uuid) TO anon, authenticated;

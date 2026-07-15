
-- Plumber profile (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon; -- needed for public /r/:slug lookup
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles by slug" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Customers (owned by plumber)
CREATE TABLE public.customers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  plumber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  lifetime_spend_cents BIGINT NOT NULL DEFAULT 0,
  visit_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plumber_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plumbers manage their own customers" ON public.customers FOR ALL
  USING (auth.uid() = plumber_id) WITH CHECK (auth.uid() = plumber_id);

-- Jobs (request + scheduled + completed lifecycle)
CREATE TYPE public.job_status AS ENUM ('pending','scheduled','in_progress','completed','paid','declined','cancelled');
CREATE TYPE public.urgency AS ENUM ('today','week','whenever');

CREATE TABLE public.jobs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  plumber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  ai_summary TEXT,
  urgency public.urgency NOT NULL DEFAULT 'whenever',
  status public.job_status NOT NULL DEFAULT 'pending',
  suggested_price_cents INT,
  final_price_cents INT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plumbers manage their own jobs" ON public.jobs FOR ALL
  USING (auth.uid() = plumber_id) WITH CHECK (auth.uid() = plumber_id);

-- Messages (SMS-style threads per customer)
CREATE TYPE public.message_direction AS ENUM ('inbound','outbound','system');
CREATE TABLE public.messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  plumber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  direction public.message_direction NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plumbers manage their own messages" ON public.messages FOR ALL
  USING (auth.uid() = plumber_id) WITH CHECK (auth.uid() = plumber_id);

-- Payments / balance ledger
CREATE TABLE public.payments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  plumber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  amount_cents INT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'payment', -- payment | withdrawal
  status TEXT NOT NULL DEFAULT 'succeeded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plumbers manage their own payments" ON public.payments FOR ALL
  USING (auth.uid() = plumber_id) WITH CHECK (auth.uid() = plumber_id);

-- Public intake: anon can insert a job request for a given plumber slug.
-- We use a SECURITY DEFINER RPC to do the customer upsert + job insert safely.
CREATE OR REPLACE FUNCTION public.submit_request(
  p_slug TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_description TEXT,
  p_urgency public.urgency
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plumber UUID;
  v_customer UUID;
  v_job UUID;
BEGIN
  SELECT id INTO v_plumber FROM public.profiles WHERE slug = p_slug;
  IF v_plumber IS NULL THEN
    RAISE EXCEPTION 'Unknown plumber';
  END IF;

  INSERT INTO public.customers (plumber_id, name, phone, address)
  VALUES (v_plumber, p_name, p_phone, p_address)
  ON CONFLICT (plumber_id, phone) DO UPDATE SET
    name = EXCLUDED.name,
    address = COALESCE(EXCLUDED.address, public.customers.address),
    updated_at = now()
  RETURNING id INTO v_customer;

  INSERT INTO public.jobs (plumber_id, customer_id, description, urgency)
  VALUES (v_plumber, v_customer, p_description, COALESCE(p_urgency,'whenever'))
  RETURNING id INTO v_job;

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_request(TEXT,TEXT,TEXT,TEXT,TEXT,public.urgency) TO anon, authenticated;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create empty profile row when user signs up (business_name + slug supplied later on onboarding step, so allow nulls-via-signup metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_biz TEXT;
  v_slug TEXT;
  v_base TEXT;
  v_i INT := 0;
BEGIN
  v_biz := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Plumbing Co');
  v_base := lower(regexp_replace(v_biz, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  IF v_base = '' THEN v_base := 'plumber'; END IF;
  v_slug := v_base;
  WHILE EXISTS(SELECT 1 FROM public.profiles WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i::text;
  END LOOP;
  INSERT INTO public.profiles (id, business_name, slug, phone)
  VALUES (NEW.id, v_biz, v_slug, NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

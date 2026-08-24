REVOKE ALL ON FUNCTION public.submit_request(text, text, text, text, text, public.urgency) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_payment(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_pay_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_request(text, text, text, text, text, public.urgency) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_payment(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pay_info(uuid) TO service_role;

DROP POLICY IF EXISTS "Anyone can read profiles by slug" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
REVOKE SELECT ON public.profiles FROM anon;
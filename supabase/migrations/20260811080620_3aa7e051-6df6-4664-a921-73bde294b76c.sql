GRANT SELECT ON public.plans TO anon;
CREATE POLICY "plans_select_anon" ON public.plans FOR SELECT TO anon USING (is_active);
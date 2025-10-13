-- Ensure client roles can see core tables once RLS is enabled.
-- PostgREST caches schema visibility per role, so without explicit grants
-- tables become invisible (e.g. PGRST205 errors) even if RLS policies exist.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.threads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.slots TO authenticated;

-- Keep future tables accessible without manual grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;

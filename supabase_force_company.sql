-- Force Insert Fallback Company with Known ID
INSERT INTO public.companies (id, name, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Emergency Fallback Company', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

-- Disable RLS for companies just in case
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- Reload schema
NOTIFY pgrst, 'reload schema';

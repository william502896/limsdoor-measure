-- Invite Codes Table
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  note text,
  max_uses int not null default 1,
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.invite_codes enable row level security;

-- Policies
-- 1. Superadmin can define/manage codes
DROP POLICY IF EXISTS "invite_codes_superadmin_select" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_superadmin_write" ON public.invite_codes;

create policy "invite_codes_superadmin_select"
on public.invite_codes for select
using (exists (
  select 1 from public.profiles p
  where p.user_id = auth.uid() and p.is_superadmin = true
));

create policy "invite_codes_superadmin_write"
on public.invite_codes for all
using (exists (
  select 1 from public.profiles p
  where p.user_id = auth.uid() and p.is_superadmin = true
))
with check (exists (
  select 1 from public.profiles p
  where p.user_id = auth.uid() and p.is_superadmin = true
));

-- 2. Service Role (Server-side API) needs full access (Bypasses RLS by default, but good to be explicit if needed, though service role bypasses anyway)

-- Insert MVP Default Code
INSERT INTO public.invite_codes(code, note, max_uses)
VALUES ('LIMS-MVP-2026', '지인 테스트용', 20)
ON CONFLICT (code) DO NOTHING;
